import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { NextResponse, type NextRequest } from "next/server";

function getSafeRedirectPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/studio";
  }

  return next;
}

function getRedirectUrl(
  request: NextRequest,
  origin: string,
  next: string,
): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (isLocalEnv) {
    return `${origin}${next}`;
  }

  if (forwardedHost) {
    return `https://${forwardedHost}${next}`;
  }

  return `${origin}${next}`;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeRedirectPath(searchParams.get("next"));

  if (code) {
    const redirectUrl = getRedirectUrl(request, origin, next);
    const { supabase, getResponse } = createRouteHandlerClient(
      request,
      () => NextResponse.redirect(redirectUrl),
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return getResponse();
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
