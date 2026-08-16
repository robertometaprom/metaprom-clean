import { NextResponse } from "next/server";
import { isMetapromAdmin } from "@/lib/admin/authorization";
import { grantAdminTestCredits, parseAdminTestCreditGrantInput } from "@/lib/admin/test-credit-grant";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 });
  }
  if (!isMetapromAdmin(user)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    const parsed = parseAdminTestCreditGrantInput(await request.json());
    const result = await grantAdminTestCredits(createAdminClient(), {
      ...parsed,
      userId: user.id,
      grantedByUserId: user.id,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron acreditar los créditos.";
    const invalidInput = /solicitud|tipo de crédito|cantidad|motivo/i.test(message);
    return NextResponse.json({ error: message }, { status: invalidInput ? 400 : 500 });
  }
}
