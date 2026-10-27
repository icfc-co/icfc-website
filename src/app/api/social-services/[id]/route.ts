import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const authHeader = headers().get("authorization") || "";
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const body = await req.json().catch(() => ({})); // { status?, admin_notes?, assigned_to? }

  // Only workflow fields; RLS + the guard trigger decide what each role may change
  const patch: Record<string, unknown> = {};
  for (const k of ["status", "admin_notes", "assigned_to"] as const) {
    if (k in body) patch[k] = body[k];
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const { data, error } = await supabase
    .from("social_service_requests")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data });
}
