import {
  hasPkceVerifierCookie,
  logOAuthCallbackDiagnostic,
  readSetCookieHeaders,
  type PreparedCookieMeta,
} from "@/lib/auth/oauth-callback-diagnostics";
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

function getRequestHost(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    return forwardedHost.split(",")[0]?.trim() ?? forwardedHost;
  }

  return new URL(request.url).host;
}

function getExchangeErrorCode(error: {
  code?: string;
  message?: string;
}): string | null {
  if (typeof error.code === "string" && error.code.length > 0) {
    return error.code;
  }

  return null;
}

function getExchangeErrorStatus(error: {
  status?: number;
}): number | null {
  return typeof error.status === "number" ? error.status : null;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const { searchParams, origin } = requestUrl;
  const code = searchParams.get("code");
  const next = getSafeRedirectPath(searchParams.get("next"));
  const callbackHost = requestUrl.host;
  const requestHost = getRequestHost(request);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const incomingCookieNames = request.cookies.getAll().map(({ name }) => name);
  const pkceVerifier = hasPkceVerifierCookie(incomingCookieNames);

  if (!code) {
    logOAuthCallbackDiagnostic({
      event: "oauth_callback_diag",
      callbackHost,
      requestHost,
      forwardedHost,
      callbackReached: true,
      codePresent: false,
      pkceVerifierPresent: pkceVerifier.present,
      pkceVerifierCookieNames: pkceVerifier.names,
      exchangeResult: "skipped",
      exchangeErrorCode: null,
      exchangeErrorStatus: null,
      cookiesPrepared: [],
      setCookieHeaders: [],
      setCookieHeaderCount: 0,
      finalRedirectDestination: `${origin}/login?error=auth_callback_error`,
      finalRedirectHost: new URL(`${origin}/login?error=auth_callback_error`)
        .host,
      redirectHostChanged:
        new URL(`${origin}/login?error=auth_callback_error`).host !==
        callbackHost,
    });

    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
  }

  const redirectUrl = getRedirectUrl(request, origin, next);
  const preparedCookies: PreparedCookieMeta[] = [];
  const { supabase, getResponse } = createRouteHandlerClient(
    request,
    () => NextResponse.redirect(redirectUrl),
    { preparedCookies },
  );
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  const response = getResponse();
  const setCookieHeaders = readSetCookieHeaders(response);
  const finalRedirectHost = new URL(redirectUrl).host;

  logOAuthCallbackDiagnostic({
    event: "oauth_callback_diag",
    callbackHost,
    requestHost,
    forwardedHost,
    callbackReached: true,
    codePresent: true,
    pkceVerifierPresent: pkceVerifier.present,
    pkceVerifierCookieNames: pkceVerifier.names,
    exchangeResult: error ? "error" : "success",
    exchangeErrorCode: error ? getExchangeErrorCode(error) : null,
    exchangeErrorStatus: error ? getExchangeErrorStatus(error) : null,
    cookiesPrepared: preparedCookies,
    setCookieHeaders,
    setCookieHeaderCount: setCookieHeaders.length,
    finalRedirectDestination: redirectUrl,
    finalRedirectHost,
    redirectHostChanged: finalRedirectHost !== callbackHost,
  });

  if (!error) {
    return response;
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
