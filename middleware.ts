import { applyFirstPartyAnalyticsCookies } from "@/lib/analytics/cookies";
import {
  detectLocale,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
} from "@/lib/i18n";
import { isClosedPublicProductionPath } from "@/lib/security/closed-production-surfaces";
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (isClosedPublicProductionPath(request.nextUrl.pathname)) {
    return new NextResponse(null, {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const response = await updateSession(request);
  const isLocaleSwitch = request.nextUrl.pathname === "/api/locale";
  const localeCookie = request.cookies.get(LOCALE_COOKIE_NAME)?.value;

  if (
    !isLocaleSwitch &&
    localeCookie !== "en" &&
    localeCookie !== "es"
  ) {
    const locale = detectLocale(request.headers.get("accept-language"));
    response.cookies.set(LOCALE_COOKIE_NAME, locale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  }

  applyFirstPartyAnalyticsCookies(request, response);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm)$).*)",
  ],
};
