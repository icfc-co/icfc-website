import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function need(...keys: string[]) {
  const miss = keys.filter((k) => !process.env[k]);
  if (miss.length) throw new Error(`Missing env: ${miss.join(", ")}`);
}

export async function GET(req: Request) {
  try {
    need(
      "STRIPE_SECRET_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY"
    );

    const url = new URL(req.url);
    const session_id = url.searchParams.get("session_id");
    if (!session_id) {
      return NextResponse.json({ ok: false, error: "Missing session_id" }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,  // service role, bypasses RLS
      { db: { schema: "public" } }
    );

    // 1) Fetch the checkout session (expand subscription for dates if present)
    const session = await stripe.checkout.sessions.retrieve(session_id, { expand: ["subscription"] });

    const metadata = (session.metadata || {}) as Record<string, string>;
    const user_id = metadata.user_id ?? "";
    if (!user_id) {
      return NextResponse.json({ ok: false, error: "Session missing metadata.user_id" }, { status: 400 });
    }

    const membershipType = metadata.membership_type ?? (session.mode === "subscription" ? "subscription" : "one_time");
    const isSub = membershipType === "subscription";
    const customerId = (session.customer as string) ?? null;

    // 2) Compute dates
    let startISO: string | null = null;
    let endISO: string | null = null;

    if (isSub && session.subscription && typeof session.subscription !== "string") {
      const sub = session.subscription;
      startISO = new Date(sub.current_period_start * 1000).toISOString();
      endISO   = new Date(sub.current_period_end   * 1000).toISOString();
    } else if (isSub && typeof session.subscription === "string") {
      const sub = await stripe.subscriptions.retrieve(session.subscription);
      startISO = new Date(sub.current_period_start * 1000).toISOString();
      endISO   = new Date(sub.current_period_end   * 1000).toISOString();
    } else {
      const now = new Date();
      startISO = now.toISOString();
      endISO   = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
    }

    // 3) Upsert memberships (direct; idempotent on user_id)
    const { error: upErr } = await admin
      .from("memberships")
      .upsert({
        user_id,
        status: "active",
        plan: metadata.plan ?? "standard",
        period: metadata.period ?? "yearly",
        amount_cents: session.amount_total ?? 0,
        stripe_customer_id: customerId,
        stripe_subscription_id: isSub && typeof session.subscription === "string"
          ? session.subscription
          : (isSub && session.subscription && typeof session.subscription !== "string"
              ? session.subscription.id
              : null),
        plan_type: isSub ? "subscription" : "one_time",
        start_date: startISO,
        end_date: endISO,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (upErr) {
      return NextResponse.json({ ok: false, step: "upsert", error: upErr.message }, { status: 500 });
    }

    // 4) Flip role → member (admins/super-admins untouched by your SQL function)
    const { error: roleErr } = await admin.rpc("replace_role_with_member", { p_user_id: user_id });
    if (roleErr) {
      return NextResponse.json({ ok: false, step: "role", error: roleErr.message }, { status: 500 });
    }

    // 5) Read back to confirm
    const { data: mRow } = await admin
      .from("memberships")
      .select("status, plan, period, start_date, end_date, plan_type, updated_at, stripe_subscription_id")
      .eq("user_id", user_id)
      .maybeSingle();

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role_id, roles(name)")
      .eq("user_id", user_id)
      .limit(1).single();

    return NextResponse.json({ ok: true, membership: mRow, role: roleRow });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Finalize error" }, { status: 500 });
  }
}
