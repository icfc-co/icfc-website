export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function PATCH(req: Request) {
  const { userId, role } = (await req.json().catch(() => ({}))) as {
    userId?: string;
    role?: string;
  };

  if (!userId || !role) {
    return NextResponse.json({ error: "userId and role are required" }, { status: 400 });
  }

  const supabase = await supabaseServer();

  const { data: isSA, error: saErr } = await supabase.rpc("is_super_admin");
  if (saErr) return NextResponse.json({ error: saErr.message }, { status: 400 });
  if (!isSA) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase.rpc("set_user_role", {
    target_user: userId,
    new_role: role,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
