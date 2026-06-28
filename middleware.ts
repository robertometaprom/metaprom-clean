import { detectLocale } from "@/lib/i18n";
import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const localeCookie = request.cookies.get("locale")?.value;

  if (localeCookie !== "en" && localeCookie !== "es") {
    const locale = detectLocale(request.headers.get("accept-language"));
    response.cookies.set("locale", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm)$).*)",
  ],
};
