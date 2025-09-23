// runtime: Node (needed for RLS + auth cookies)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");            // e.g. "admin" | "user" | null
  const q = searchParams.get("q");
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Math.min(Number(searchParams.get("pageSize") || "50"), 100);
  const offset = (page - 1) * pageSize;

  const supabase = await supabaseServer();

  // quick server-side gate (optional, RPC also enforces)
  const { data: isSA, error: saErr } = await supabase.rpc("is_super_admin");
  if (saErr) return NextResponse.json({ error: saErr.message }, { status: 400 });
  if (!isSA) return NextResponse.json({ error: "Forbidden, please login" }, { status: 403 });

  const { data, error } = await supabase.rpc("list_users_with_roles", {
    filter_role: role,
    search_text: q,
    page_size: pageSize,
    page_offset: offset,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ users: data ?? [] });
}
