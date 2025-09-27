// src/app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function missingEnv(...keys: string[]) {
  return keys.filter((k) => !process.env[k]);
}

export async function POST(req: Request) {
  // ---- 0) ENV sanity
  const miss = missingEnv(
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY"
  );
  if (miss.length) {
    console.error("WEBHOOK ENV MISSING:", miss);
    return NextResponse.json({ error: `Missing env: ${miss.join(", ")}` }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role, bypass RLS
    { db: { schema: "public" } }
  );

  // ---- 1) logger (do NOT swallow insert errors silently)
  const log = async (note: string, type: string, payload: any, error?: any) => {
    const res = await admin.from("webhook_logs").insert({
      event_type: type,
      note,
      payload,
      error: error ? String(error) : null,
    });
    if (res.error) {
      console.error("[WEBHOOK LOG FAILED]", note, res.error.message);
    }
  };
  const dbg = async (note: string, payload: any) => {
    console.log("[WEBHOOK]", note, payload);
    await log(note, "debug", payload);
  };

  // ---- 2) PROBE write (verifies Supabase creds/table NOW)
  const probe = await admin.from("webhook_logs").insert({
    event_type: "probe",
    note: "webhook boot",
    payload: {
      project: process.env.NEXT_PUBLIC_SUPABASE_URL,
      env: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    },
  });
  if (probe.error) {
    console.error("PROBE WRITE FAILED:", probe.error.message);
    return NextResponse.json({ error: "Supabase write failed: " + probe.error.message }, { status: 500 });
  }

  // ---- 3) Verify Stripe signature (must use RAW body)
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    await log("missing_stripe_signature", "webhook", { len: raw.length });
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    await log("signature_failed", "webhook", {}, err?.message);
    return NextResponse.json({ error: `Signature verification failed: ${err.message}` }, { status: 400 });
  }

  await dbg("received_event", { id: event.id, type: event.type, live: event.livemode });

  // ---- helpers
  const iso = (unix?: number | null) => (unix ? new Date(unix * 1000).toISOString() : null);

  async function upsertMembership(row: {
    user_id: string;
    status: string;
    plan?: string | null;
    period?: string | null;
    amount_cents?: number | null;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    plan_type?: "subscription" | "one_time" | null;
    start_date?: string | null;
    end_date?: string | null;
  }) {
    const res = await admin.from("memberships").upsert(
      {
        user_id: row.user_id,
        status: row.status,
        plan: row.plan ?? null,
        period: row.period ?? null,
        amount_cents: row.amount_cents ?? null,
        stripe_customer_id: row.stripe_customer_id ?? null,
        stripe_subscription_id: row.stripe_subscription_id ?? null,
        plan_type: row.plan_type ?? null,
        start_date: row.start_date ?? null,
        end_date: row.end_date ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (res.error) throw res.error;
  }

  try {
    switch (event.type) {
      // =========================================================
      // A) CHECKOUT SESSION COMPLETED — membership or donation
      // =========================================================
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;

        const meta = (s.metadata ?? {}) as Record<string, string | undefined>;
        const fund = (meta.fund ?? "membership").toLowerCase();
        const isMembership = fund === "membership";

        // For membership we REQUIRE a user_id in metadata
        const user_id =
          (meta.user_id as string | undefined) ||
          (meta.userId as string | undefined) ||
          undefined;

        await log("checkout_session_meta", "webhook", {
          fund, isMembership, user_id, mode: s.mode, payment_status: s.payment_status,
        });

        const amount_cents = s.amount_total ?? 0;
        const customerId = (s.customer as string) ?? null;

        // ---- MEMBERSHIP PATH ----
        if (isMembership) {
          if (!user_id) {
            await log("missing_user_id_membership", "webhook", { metadata: s.metadata });
            return NextResponse.json({ received: true });
          }
          if (s.payment_status !== "paid") {
            await log("membership_skipped_unpaid", "webhook", { session_id: s.id, status: s.payment_status });
            return NextResponse.json({ received: true });
          }

          const isSub = s.mode === "subscription" || meta.membership_type === "subscription";
          const subId = isSub && typeof s.subscription === "string" ? s.subscription : null;

          let startISO: string | null = null;
          let endISO: string | null = null;
          const planType: "subscription" | "one_time" = isSub ? "subscription" : "one_time";

          if (isSub && subId) {
            const sub = await stripe.subscriptions.retrieve(subId);
            startISO = iso(sub.current_period_start);
            endISO = iso(sub.current_period_end);
          } else {
            const now = new Date();
            startISO = now.toISOString();
            endISO = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
          }

          // 1) Upsert memberships
          try {
            await upsertMembership({
              user_id,
              status: "active",
              plan: meta.plan ?? "standard",
              period: meta.period ?? "yearly",
              amount_cents,
              stripe_customer_id: customerId,
              stripe_subscription_id: subId ?? null,
              plan_type: planType,
              start_date: startISO,
              end_date: endISO,
            });
            await log("membership_upsert_ok", "webhook", { user_id });
          } catch (e: any) {
            await log("membership_upsert_error", "webhook", { user_id }, e?.message);
            throw e;
          }

          // 2) Flip role → member via service-only RPC (skips admins)
          const { error: roleErr } = await admin.rpc("service_set_member_role", { p_user_id: user_id });
          if (roleErr) {
            await log("service_set_member_role_failed", "webhook", { user_id }, roleErr.message);
            throw roleErr;
          }
          await log("service_set_member_role_ok", "webhook", { user_id });

          // 3) Verify (optional)
          const { data: mRow } = await admin
            .from("memberships")
            .select("user_id,status,plan,period,plan_type,start_date,end_date,updated_at")
            .eq("user_id", user_id).maybeSingle();
          const { data: roleRow } = await admin
            .from("user_roles")
            .select("role_id, roles(name)")
            .eq("user_id", user_id).limit(1).single();
          await dbg("membership_verify", { mRow, roleRow });

          break;
        }

        // ---- DONATION PATH (no role changes) ----
        if (s.payment_status !== "paid") {
          await log("donation_skipped_unpaid", "webhook", { session_id: s.id, status: s.payment_status });
          return NextResponse.json({ received: true });
        }

        const donorName = meta.donorName ?? s.customer_details?.name ?? null;
        const donorEmail = meta.donorEmail ?? s.customer_details?.email ?? null;
        const note = meta.note ?? null;
        const recurrence = (meta.recurrence as string | undefined) ?? "one_time";
        const currency = s.currency ?? "usd";
        const payment_intent_id = typeof s.payment_intent === "string" ? s.payment_intent : null;
        const checkout_session_id = s.id;

        const d = await admin.from("donations").upsert(
          {
            method: "stripe",
            status: "succeeded",
            amount_cents,
            currency,
            fund,
            recurrence,
            note,
            donor_name: donorName,
            donor_email: donorEmail,
            user_id: (user_id ?? null) as string | null,
            stripe_payment_intent_id: payment_intent_id,
            stripe_checkout_session_id: checkout_session_id,
            stripe_customer_id: customerId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "stripe_checkout_session_id" }
        );
        if (d.error) {
          await log("donation_upsert_failed", "webhook", { checkout_session_id }, d.error.message);
          throw d.error;
        }
        await log("donation_upsert_ok", "webhook", { checkout_session_id });
        break;
      }

      // =========================================================
      // B) SUBSCRIPTION CHANGES — keep membership + role in sync
      // =========================================================
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const status = sub.status;

        const { data: m, error } = await admin
          .from("memberships")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        if (error) throw error;

        if (!m?.user_id) {
          await log("membership_not_found_for_customer", "webhook", { customerId });
          break;
        }

        const item = sub.items.data[0];
        const startISO = iso(sub.current_period_start);
        const endISO = iso(sub.current_period_end);

        // Update membership
        try {
          await upsertMembership({
            user_id: m.user_id,
            status,
            plan: item?.price?.nickname ?? "standard",
            period: item?.price?.recurring?.interval ?? "year",
            amount_cents: item?.price?.unit_amount ?? 0,
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            plan_type: "subscription",
            start_date: startISO,
            end_date: endISO,
          });
          await log("membership_upsert_ok_sub", "webhook", { user_id: m.user_id, status });
        } catch (e: any) {
          await log("membership_upsert_error_sub", "webhook", { user_id: m.user_id }, e?.message);
          throw e;
        }

        // Flip role based on status via service-only RPCs
        if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") {
          const { error: dErr } = await admin.rpc("service_set_user_role", { p_user_id: m.user_id });
          if (dErr) await log("service_set_user_role_failed", "webhook", { user_id: m.user_id }, dErr.message);
        } else {
          const { error: pErr } = await admin.rpc("service_set_member_role", { p_user_id: m.user_id });
          if (pErr) await log("service_set_member_role_failed", "webhook", { user_id: m.user_id }, pErr.message);
        }

        // Verify (optional)
        const { data: roleRow, error: roleSelErr } = await admin
          .from("user_roles")
          .select("role_id, roles(name)")
          .eq("user_id", m.user_id)
          .limit(1)
          .single();
        await dbg("role_verify_sub", { roleRow, roleSelErr: roleSelErr?.message });

        break;
      }

      default:
        await log("ignored_event", "webhook", { id: event.id, type: event.type });
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    await log("handler_failed", "webhook", { type: event?.type }, e?.message);
    return NextResponse.json({ error: e?.message || "Webhook error" }, { status: 500 });
  }
}

// Handy GET ping to confirm this route is deployed & can write to DB
export async function GET() {
  const miss = missingEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  if (miss.length) return NextResponse.json({ ok: false, error: `Missing env: ${miss.join(", ")}` }, { status: 500 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: { schema: "public" },
  });
  const { error } = await admin.from("webhook_logs").insert({
    event_type: "manual-ping",
    note: "ping ok",
    payload: { project: process.env.NEXT_PUBLIC_SUPABASE_URL },
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
