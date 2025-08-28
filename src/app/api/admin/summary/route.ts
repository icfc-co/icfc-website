// src/app/api/admin/donations/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(req: NextRequest) {
  const supa = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll() { /* no-op */ },
      },
    }
  );

  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { ok: false, res: new NextResponse("Unauthorized", { status: 401 }) };

  const { data: isAdmin } = await supa.rpc("is_admin");
  if (!isAdmin) return { ok: false, res: new NextResponse("Forbidden", { status: 403 }) };

  return { ok: true as const };
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.res!;

  const url = new URL(req.url);
  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  );

  const build = (q: any) => {
    const method = url.searchParams.get("method");
    const status = url.searchParams.get("status");
    const fund   = url.searchParams.get("fund");
    const from   = url.searchParams.get("from");
    const to     = url.searchParams.get("to");
    const srch   = url.searchParams.get("q");

    if (method) q = q.eq("method", method);
    if (status) q = q.eq("status", status);
    if (fund)   q = q.eq("fund", fund);
    if (from)   q = q.gte("created_at", `${from}T00:00:00Z`);
    if (to)     q = q.lte("created_at", `${to}T23:59:59Z`);
    if (srch)   q = q.or(
      `donor_email.ilike.%${srch}%,donor_name.ilike.%${srch}%,external_ref.ilike.%${srch}%`
    );
    return q;
  };

  const byMethodQ = build(svc.from("donations").select("method,total:sum(amount_cents)"));
  const byFundQ   = build(svc.from("donations").select("fund,total:sum(amount_cents)"));

  const [mRes, fRes] = await Promise.all([byMethodQ, byFundQ]);
  if (mRes.error) return NextResponse.json({ error: mRes.error.message }, { status: 500 });
  if (fRes.error) return NextResponse.json({ error: fRes.error.message }, { status: 500 });

  return NextResponse.json({
    byMethod: (mRes.data || []).map((r: any) => ({ method: r.method, total_cents: r.total || 0 })),
    byFund:   (fRes.data || []).map((r: any) => ({ fund: r.fund,     total_cents: r.total || 0 })),
  });
}
