import type { NextRequest, NextResponse } from "next/server";
import {
  applyFirstTouchTikTokClickId,
  incomingFromSearchParams,
  incomingShareTouch,
  parseAcquisitionState,
  resolveAcquisitionState,
  serializeAcquisitionState,
  type AcquisitionState,
} from "@/lib/analytics/attribution";
import { matchPublicShareSlug, readShareChannelFromSearchParams } from "@/lib/analytics/channel";
import {
  ACQUISITION_COOKIE_MAX_AGE_SECONDS,
  ACQUISITION_COOKIE_NAME,
  generateVisitorId,
  isVisitorId,
  VISITOR_COOKIE_MAX_AGE_SECONDS,
  VISITOR_COOKIE_NAME,
} from "@/lib/analytics/ids";
import {
  sanitizeTikTokClickId,
  sanitizeTikTokTtp,
  TIKTOK_TTP_COOKIE_NAME,
} from "@/lib/tiktok/ids";

export type CookieReader = {
  get(name: string): { value: string } | undefined;
};

const SKIP_ACQUISITION_PATH =
  /^\/(?:api|auth|_next|admin)\b/;

function cookieOptions(maxAge: number): {
  path: string;
  maxAge: number;
  sameSite: "lax";
  secure: boolean;
  httpOnly: boolean;
} {
  return {
    path: "/",
    maxAge,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
  };
}

export function getCookieFromHeader(
  cookieHeader: string | null | undefined,
  name: string,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) {
      continue;
    }
    const key = part.slice(0, idx).trim();
    if (key !== name) {
      continue;
    }
    try {
      return decodeURIComponent(part.slice(idx + 1).trim());
    } catch {
      return part.slice(idx + 1).trim();
    }
  }

  return null;
}

export function readVisitorIdFromCookies(cookies: CookieReader): string | null {
  const value = cookies.get(VISITOR_COOKIE_NAME)?.value ?? null;
  return isVisitorId(value) ? value : null;
}

export function readVisitorIdFromRequest(request: Request): string | null {
  const value = getCookieFromHeader(
    request.headers.get("cookie"),
    VISITOR_COOKIE_NAME,
  );
  return isVisitorId(value) ? value : null;
}

export function readAcquisitionFromCookies(
  cookies: CookieReader,
): AcquisitionState | null {
  return parseAcquisitionState(cookies.get(ACQUISITION_COOKIE_NAME)?.value);
}

export function readAcquisitionFromRequest(
  request: Request,
): AcquisitionState | null {
  return parseAcquisitionState(
    getCookieFromHeader(request.headers.get("cookie"), ACQUISITION_COOKIE_NAME),
  );
}

/**
 * Ensure a first-party visitor id and capture first-touch / first-share
 * acquisition. Safe for Edge middleware. Never writes PII.
 */
export function applyFirstPartyAnalyticsCookies(
  request: NextRequest,
  response: NextResponse,
): void {
  const existingVisitor = readVisitorIdFromCookies(request.cookies);
  const visitorId = existingVisitor ?? generateVisitorId();
  if (!existingVisitor) {
    response.cookies.set(
      VISITOR_COOKIE_NAME,
      visitorId,
      cookieOptions(VISITOR_COOKIE_MAX_AGE_SECONDS),
    );
  }

  const pathname = request.nextUrl.pathname;
  if (SKIP_ACQUISITION_PATH.test(pathname)) {
    return;
  }

  const existing = readAcquisitionFromCookies(request.cookies);
  const shareSlug = matchPublicShareSlug(pathname);
  const incoming = shareSlug
    ? incomingShareTouch({
        shareSlug,
        shareChannel: readShareChannelFromSearchParams(request.nextUrl.searchParams),
      })
    : incomingFromSearchParams({
        searchParams: request.nextUrl.searchParams,
        referrer: request.headers.get("referer"),
        requestHost: request.nextUrl.host,
        pathname,
      });

  const withOrigin = resolveAcquisitionState(existing, incoming);
  const next = applyFirstTouchTikTokClickId(
    withOrigin,
    sanitizeTikTokClickId(request.nextUrl.searchParams.get("ttclid")),
  );
  if (!next) {
    return;
  }

  const serialized = serializeAcquisitionState(next);
  const previous = existing ? serializeAcquisitionState(existing) : null;
  if (serialized === previous) {
    return;
  }

  response.cookies.set(
    ACQUISITION_COOKIE_NAME,
    serialized,
    cookieOptions(ACQUISITION_COOKIE_MAX_AGE_SECONDS),
  );
}

export function readTikTokClickIdFromAcquisition(
  acquisition: AcquisitionState | null,
): string | null {
  return sanitizeTikTokClickId(acquisition?.tiktok?.ttclid);
}

export function readTikTokTtpFromRequest(request: Request): string | null {
  return sanitizeTikTokTtp(
    getCookieFromHeader(request.headers.get("cookie"), TIKTOK_TTP_COOKIE_NAME),
  );
}

export function readTikTokCheckoutSnapshot(request: Request): {
  ttclid: string | null;
  ttp: string | null;
} {
  return {
    ttclid: readTikTokClickIdFromAcquisition(readAcquisitionFromRequest(request)),
    ttp: readTikTokTtpFromRequest(request),
  };
}
