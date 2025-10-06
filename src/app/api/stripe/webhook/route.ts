// src/app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ----------------------------- helpers ----------------------------- */
function missingEnv(...keys: string[]) {
  return keys.filter((k) => !process.env[k]);
}
const iso = (unix?: number | null) => (unix ? new Date(unix * 1000).toISOString() : null);
const todayISO = () => { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); };
const plusOneYearISO = (yyyy_mm_dd: string) => { const d = new Date(yyyy_mm_dd + "T00:00:00Z"); d.setUTCFullYear(d.getUTCFullYear() + 1); return d.toISOString().slice(0,10); };
const isUuid = (v: any) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

/* --- designation normalizer --------------------------------------- */
type Designation =
  | 'head_of_household'
  | 'spouse'
  | 'father_or_father_in_law'
  | 'mother_or_mother_in_law'
  | 'son_or_son_in_law'
  | 'daughter_or_daughter_in_law'
  | 'other';

const normalizeDesignation = (raw: any, isPrimary: boolean): Designation => {
  if (isPrimary) return 'head_of_household';
  const val = String(raw || '').toLowerCase().trim();
  const allowed: Designation[] = [
    'head_of_household',
    'spouse',
    'father_or_father_in_law',
    'mother_or_mother_in_law',
    'son_or_son_in_law',
    'daughter_or_daughter_in_law',
    'other',
  ];
  return (allowed as string[]).includes(val) ? (val as Designation) : 'other';
};

/* ------------------------------ route ------------------------------ */
export async function POST(req: Request) {
  // 0) ENV
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
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role (RLS bypass)
    { db: { schema: "public" } }
  );

  // logging
  const log = async (note: string, type: string, payload: any, error?: any) => {
    const res = await admin.from("webhook_logs").insert({
      event_type: type,
      note,
      payload,
      error: error ? String(error) : null,
    });
    if (res.error) console.error("[WEBHOOK LOG FAILED]", note, res.error.message);
  };
  const dbg = async (note: string, payload: any) => {
    console.log("[WEBHOOK]", note, payload);
    await log(note, "debug", payload);
  };

  // 1) probe write (fail early if DB creds are wrong)
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

  // 2) verify signature on RAW body
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

  // 3) Idempotency: skip if we already processed this event
  {
    const { error } = await admin.from("processed_events").insert({ event_id: event.id });
    if (error) {
      await log("event_already_processed", "webhook", { event_id: event.id }, error.message);
      return NextResponse.json({ received: true });
    }
  }

  try {
    switch (event.type) {
      /* =======================================================================
       * A) CHECKOUT SESSION COMPLETED — membership OR donation
       * ======================================================================= */
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;

        const meta = (s.metadata ?? {}) as Record<string, string | undefined>;
        const fund = (meta.fund ?? "membership").toLowerCase();
        const isMembership = fund === "membership";

        // 🔐 Accept only a real UUID for user_id; otherwise store null
        const rawUserId =
          meta.supabase_user_id || meta.user_id || meta.userId || undefined;
        const user_id = isUuid(rawUserId) ? (rawUserId as string) : null;

        await log("checkout_session_meta", "webhook", {
          fund, isMembership, rawUserId, accepted_user_id: Boolean(user_id), mode: s.mode, payment_status: s.payment_status,
        });

        const customerId = (s.customer as string) ?? null;

        /* ---------------------------- MEMBERSHIP PATH ---------------------------- */
        if (isMembership) {
          if (s.payment_status !== "paid") {
            await log("membership_skipped_unpaid", "webhook", { session_id: s.id, status: s.payment_status });
            return NextResponse.json({ received: true });
          }

          // Load active pricing (dynamic)
          const { data: pricing, error: priceErr } = await admin
            .from("membership_pricing")
            .select("type, amount_cents, min_age, max_age")
            .eq("is_active", true);
          if (priceErr || !pricing?.length) {
            await log("pricing_not_available", "webhook", {}, priceErr?.message);
            return NextResponse.json({ received: true });
          }
          const priceMap: Record<string, { amount_cents: number; min_age: number | null; max_age: number | null }> =
            Object.fromEntries(pricing.map((p: any) => [p.type, { amount_cents: p.amount_cents, min_age: p.min_age, max_age: p.max_age }]));
          const amountFor = (t: string, age: number) => {
            const row = priceMap[t];
            if (!row) return 0;
            if (t === "youth" && row.max_age != null && age > row.max_age) {
              return priceMap["regular"]?.amount_cents ?? 0;
            }
            return row.amount_cents ?? 0;
          };

          // payload from your membership checkout route
          const primary_name  = meta.primary_name || "";
          const primary_email = (meta.primary_email || "").trim().toLowerCase();
          const primary_phone = meta.primary_phone || "";
          const members_json  = meta.members_json || "[]";
          const recurrence    = (meta.recurrence ?? "yearly") as "one_time" | "yearly";
          const renewal_of    = meta.renewal_of_household_id || null;

          // ---- parse and normalize members (accept verbose or compact) ----
          let members: Array<{
            name: string;
            age: number;
            sex?: "male" | "female";
            phone?: string | null;
            email?: string | null;
            membership_type: "student" | "senior" | "regular" | "youth";
            designation?: Designation;
          }> = [];
          try { members = JSON.parse(members_json); } catch { members = []; }

          if (Array.isArray(members) && members.length) {
            members = members.map((m: any) => {
              if (m && (m.n !== undefined || m.mt !== undefined || m.dg !== undefined)) {
                // compact → verbose
                return {
                  name: String(m.n ?? "").trim(),
                  age: Number(m.a ?? 0),
                  sex: (m.sx as "male" | "female" | undefined),
                  email: m.em ? String(m.em).toLowerCase().trim() : null,
                  phone: m.ph ?? null,
                  membership_type: (m.mt ?? "regular") as "student" | "senior" | "regular" | "youth",
                  designation: m.dg as Designation | undefined,
                };
              }
              // already verbose
              return {
                name: String(m?.name ?? "").trim(),
                age: Number(m?.age ?? 0),
                sex: m?.sex as "male" | "female" | undefined,
                email: m?.email ? String(m.email).toLowerCase().trim() : null,
                phone: m?.phone ?? null,
                membership_type: (m?.membership_type ?? "regular") as "student" | "senior" | "regular" | "youth",
                designation: m?.designation as Designation | undefined,
              };
            });
          }

          // compute new period
          let start_date = todayISO();
          let end_date   = plusOneYearISO(start_date);

          // dedupe members client snapshot before insert (name/email)
          const uniqMembers: typeof members = [];
          const seen = new Set<string>();
          for (const m of members) {
            const key = `${(m.name || "").trim().toLowerCase()}|${(m.email || "").trim().toLowerCase()}`;
            if (!seen.has(key)) { seen.add(key); uniqMembers.push(m); }
          }

          // === Household handling ===
          let household_id: string;

          if (renewal_of) {
            // RENEWAL: extend same household window
            const { data: existing, error: exErr } = await admin
              .from("membership_households")
              .select("id, end_date")
              .eq("id", renewal_of)
              .maybeSingle();
            if (exErr || !existing) {
              await log("renewal_household_not_found", "webhook", { renewal_of }, exErr?.message);
              return NextResponse.json({ received: true });
            }

            const currentEnd = existing.end_date || start_date;
            const startFrom  = (new Date(currentEnd) > new Date(start_date)) ? currentEnd : start_date;
            const endTo      = plusOneYearISO(startFrom);

            const { error: upErr } = await admin
              .from("membership_households")
              .update({ status: "active", start_date: startFrom, end_date: endTo })
              .eq("id", renewal_of);
            if (upErr) {
              await log("household_update_failed", "webhook", { renewal_of }, upErr.message);
              throw upErr;
            }

            household_id = renewal_of;
            start_date   = startFrom;
            end_date     = endTo;

            // refresh members snapshot (delete+insert)
            const del = await admin.from("membership_members").delete().eq("household_id", household_id);
            if (del.error) {
              await log("members_delete_failed", "webhook", { household_id }, del.error.message);
              throw del.error;
            }

            if (uniqMembers.length) {
              const rows = uniqMembers.map((m, idx) => ({
                household_id,
                name: m.name,
                age: m.age,
                phone: m.phone || null,
                email: (m.email || null),
                sex: m.sex || null,
                membership_type: m.membership_type,
                price_cents: amountFor(m.membership_type, m.age),
                designation: normalizeDesignation(m.designation, idx === 0),
              }));
              const ins = await admin.from("membership_members").insert(rows);
              if (ins.error && String(ins.error.code) !== "23505") {
                await log("members_insert_failed", "webhook", { household_id }, ins.error.message);
                throw ins.error;
              }
            }
          } else {
            // FIRST-TIME: create or reuse existing household for same period+email
            const tryInsert = await admin
              .from("membership_households")
              .insert({
                user_id: user_id, // ✅ UUID or null
                primary_name,
                primary_email,
                primary_phone,
                recurrence: "yearly",
                status: "active",
                start_date,
                end_date,
                stripe_customer_id: customerId,
              })
              .select("id")
              .single();

            if (tryInsert.error) {
              if (String(tryInsert.error.code) === "23505") {
                const sel = await admin
                  .from("membership_households")
                  .select("id")
                  .eq("start_date", start_date)
                  .eq("end_date", end_date)
                  .ilike("primary_email", primary_email || "")
                  .maybeSingle();
                if (sel.error || !sel.data) {
                  await log("household_conflict_lookup_failed", "webhook", { primary_email, start_date, end_date }, sel.error?.message);
                  throw tryInsert.error;
                }
                household_id = sel.data.id;
              } else {
                await log("household_insert_failed", "webhook", { primary_email }, tryInsert.error.message);
                throw tryInsert.error;
              }
            } else {
              household_id = tryInsert.data.id;
            }

            // insert members snapshot
            if (uniqMembers.length) {
              const rows = uniqMembers.map((m, idx) => ({
                household_id,
                name: m.name,
                age: m.age,
                phone: m.phone || null,
                email: (m.email || null),
                sex: m.sex || null,
                membership_type: m.membership_type,
                price_cents: amountFor(m.membership_type, m.age),
                designation: normalizeDesignation(m.designation, idx === 0),
              }));
              const mem = await admin.from("membership_members").insert(rows);
              if (mem.error && String(mem.error.code) !== "23505") {
                await log("members_insert_failed", "webhook", { household_id }, mem.error.message);
                throw mem.error;
              }
            }

            // eligibility for auto-role at future login
            const emails = new Set<string>();
            if (primary_email) emails.add(primary_email);
            for (const m of uniqMembers) if (m.email) emails.add((m.email || "").toLowerCase());
            if (emails.size) {
              const eligRows = Array.from(emails).map((email) => ({ email, household_id, active: true }));
              const insElig = await admin.from("member_eligibility").insert(eligRows);
              if (insElig.error && String(insElig.error.code) !== "23505") {
                await log("eligibility_upsert_failed", "webhook", { household_id }, insElig.error.message);
                throw insElig.error;
              }
            }
          }

          // authoritative total from snapshot
          const { data: snap, error: snapErr } = await admin
            .from("membership_members")
            .select("price_cents")
            .eq("household_id", household_id);
          if (snapErr) await log("members_snapshot_failed", "webhook", { household_id }, snapErr.message);
          const total_cents = (snap || []).reduce((sum: number, r: any) => sum + (r.price_cents || 0), 0);

          // payment row (UPSERT by stripe_session_id)
          const interval = recurrence === "yearly" ? "year" : null;
          const pay = await admin
            .from("membership_payments")
            .upsert({
              household_id,
              stripe_session_id: s.id,
              stripe_payment_intent: typeof s.payment_intent === "string" ? s.payment_intent : null,
              amount_cents: total_cents,
              currency: s.currency ?? "usd",
              interval,
              status: "succeeded",
            }, { onConflict: "stripe_session_id" });
          if (pay.error) {
            await log("payment_upsert_failed", "webhook", { household_id, session_id: s.id }, pay.error.message);
            throw pay.error;
          }

          // Optional: promote buyer (only if we have a valid UUID)
          if (user_id) {
            const { error: roleErr } = await admin.rpc("service_set_member_role", { p_user_id: user_id });
            if (roleErr) await log("service_set_member_role_failed", "webhook", { user_id }, roleErr.message);
          }

          await log("membership_household_flow_ok", "webhook", { session_id: s.id, household_id });
          break;
        }

        /* ------------------------------ DONATION PATH ------------------------------ */
        if (s.payment_status !== "paid") {
          await log("donation_skipped_unpaid", "webhook", { session_id: s.id, status: s.payment_status });
          return NextResponse.json({ received: true });
        }

        const amount_cents = s.amount_total ?? 0;
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
            user_id: user_id, // ✅ UUID or null
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

      /* =======================================================================
       * B) SUBSCRIPTION CHANGES — optional legacy membership sync
       * ======================================================================= */
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

        const res = await admin.from("memberships").upsert(
          {
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
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
        if (res.error) {
          await log("membership_upsert_error_sub", "webhook", { user_id: m.user_id }, res.error.message);
          throw res.error;
        }
        await log("membership_upsert_ok_sub", { user_id: m.user_id, status } as any, {});

        if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") {
          const { error: dErr } = await admin.rpc("service_set_user_role", { p_user_id: m.user_id });
          if (dErr) await log("service_set_user_role_failed", "webhook", { user_id: m.user_id }, dErr.message);
        } else {
          const { error: pErr } = await admin.rpc("service_set_member_role", { p_user_id: m.user_id });
          if (pErr) await log("service_set_member_role_failed", "webhook", { user_id: m.user_id }, pErr.message);
        }
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

/* ------------------------------- GET ping ------------------------------- */
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
