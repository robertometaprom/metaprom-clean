import {
  cookieMetaFromOptions,
  type PreparedCookieMeta,
} from "@/lib/auth/oauth-callback-diagnostics";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export type RouteHandlerDiagnostics = {
  preparedCookies: PreparedCookieMeta[];
};

export function createRouteHandlerClient(
  request: NextRequest,
  getResponse: () => NextResponse,
  diagnostics?: RouteHandlerDiagnostics,
) {
  let response = getResponse();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        if (diagnostics) {
          cookiesToSet.forEach(({ name, options }) => {
            diagnostics.preparedCookies.push(
              cookieMetaFromOptions(name, options),
            );
          });
        }

        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = getResponse();

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  return {
    supabase,
    getResponse: () => response,
  };
}
