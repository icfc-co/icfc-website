import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const authHeader = headers().get("authorization") || ""; // "Bearer <token>"
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } } // forward user JWT to PostgREST
  );

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const from = url.searchParams.get("from") ?? "1970-01-01";
  const to   = url.searchParams.get("to")   ?? "2999-12-31";
  const status = url.searchParams.getAll("status");
  const mine = url.searchParams.get("mine") === "1";

  let qb = supabase
    .from("social_service_requests")
    .select("*")
    .gte("created_at", from)
    .lte("created_at", to)
    .order("created_at", { ascending: false });

  if (status.length) qb = qb.in("status", status);
  if (q) qb = qb.or(`requester_name.ilike.%${q}%,organization.ilike.%${q}%,project_description.ilike.%${q}%`);

  if (mine) {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return NextResponse.json({ data: [] });
    qb = qb.eq("assigned_to", userRes.user.id);
  }

  const { data, error } = await qb;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
