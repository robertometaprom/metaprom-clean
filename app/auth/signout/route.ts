import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { NextResponse, type NextRequest } from "next/server";

async function signOut(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  const { supabase, getResponse } = createRouteHandlerClient(
    request,
    () => NextResponse.redirect(loginUrl),
  );
  await supabase.auth.signOut();

  return getResponse();
}

export async function GET(request: NextRequest) {
  return signOut(request);
}

export async function POST(request: NextRequest) {
  return signOut(request);
}
