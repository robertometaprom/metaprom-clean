import type { NextResponse } from "next/server";

export type PreparedCookieMeta = {
  name: string;
  domain?: string;
  path?: string;
  sameSite?: string | boolean;
  secure?: boolean;
  httpOnly?: boolean;
};

export type OAuthCallbackDiagnosticPayload = {
  event: "oauth_callback_diag";
  callbackHost: string;
  requestHost: string;
  forwardedHost: string | null;
  callbackReached: true;
  codePresent: boolean;
  pkceVerifierPresent: boolean;
  pkceVerifierCookieNames: string[];
  exchangeResult: "success" | "error" | "skipped";
  exchangeErrorCode: string | null;
  exchangeErrorStatus: number | null;
  cookiesPrepared: PreparedCookieMeta[];
  setCookieHeaders: PreparedCookieMeta[];
  setCookieHeaderCount: number;
  finalRedirectDestination: string;
  finalRedirectHost: string;
  redirectHostChanged: boolean;
};

const DIAG_PREFIX = "[oauth-callback-diag]";

export function hasPkceVerifierCookie(
  cookieNames: string[],
): { present: boolean; names: string[] } {
  const names = cookieNames.filter((name) => name.endsWith("-code-verifier"));
  return { present: names.length > 0, names };
}

export function cookieMetaFromOptions(
  name: string,
  options?: {
    domain?: string;
    path?: string;
    sameSite?: string | boolean;
    secure?: boolean;
    httpOnly?: boolean;
  },
): PreparedCookieMeta {
  return {
    name,
    domain: options?.domain,
    path: options?.path,
    sameSite: options?.sameSite,
    secure: options?.secure,
    httpOnly: options?.httpOnly,
  };
}

export function parseSetCookieHeader(header: string): PreparedCookieMeta {
  const segments = header.split(";").map((segment) => segment.trim());
  const nameSegment = segments[0] ?? "";
  const equalsIndex = nameSegment.indexOf("=");
  const name =
    equalsIndex === -1 ? nameSegment : nameSegment.slice(0, equalsIndex);

  let domain: string | undefined;
  let path: string | undefined;
  let sameSite: string | undefined;
  let secure = false;
  let httpOnly = false;

  for (const segment of segments.slice(1)) {
    const lower = segment.toLowerCase();
    if (lower === "secure") {
      secure = true;
      continue;
    }
    if (lower === "httponly") {
      httpOnly = true;
      continue;
    }

    const attributeSeparator = segment.indexOf("=");
    if (attributeSeparator === -1) {
      continue;
    }

    const key = segment.slice(0, attributeSeparator).trim().toLowerCase();
    const value = segment.slice(attributeSeparator + 1).trim();

    if (key === "domain") {
      domain = value;
    } else if (key === "path") {
      path = value;
    } else if (key === "samesite") {
      sameSite = value;
    }
  }

  return { name, domain, path, sameSite, secure, httpOnly };
}

export function readSetCookieHeaders(response: NextResponse): PreparedCookieMeta[] {
  const rawHeaders =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];

  return rawHeaders.map(parseSetCookieHeader);
}

export function logOAuthCallbackDiagnostic(
  payload: OAuthCallbackDiagnosticPayload,
): void {
  console.log(`${DIAG_PREFIX} ${JSON.stringify(payload)}`);
}
