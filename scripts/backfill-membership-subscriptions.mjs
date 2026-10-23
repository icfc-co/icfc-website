// scripts/backfill-membership-subscriptions.mjs
//
// One-time backfill for the subscription columns on membership_households
// (stripe_subscription_id, subscription_status, current_period_end), plus the
// yearly auto-renewals the webhook ignored before it handled invoice.paid.
//
// Dry run (default, writes nothing):
//   node --env-file=.env.local scripts/backfill-membership-subscriptions.mjs
// Write changes:
//   node --env-file=.env.local scripts/backfill-membership-subscriptions.mjs --apply
//
// Needs STRIPE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");

const missing = ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing env: ${missing.join(", ")}`);
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const iso = (unix) => (unix ? new Date(unix * 1000).toISOString() : null);

async function loadHouseholds() {
  const all = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("membership_households")
      .select("id, primary_name, primary_email, stripe_customer_id, stripe_subscription_id, end_date, created_at")
      .not("stripe_customer_id", "is", null)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...data);
    if (data.length < PAGE) return all;
  }
}

// Find the membership subscription for a household via the customer's checkout sessions.
// If a customer has several, take the one created closest to the household.
async function findSubscriptionId(hh) {
  if (hh.stripe_subscription_id) return hh.stripe_subscription_id;
  const sessions = await stripe.checkout.sessions.list({ customer: hh.stripe_customer_id, limit: 100 });
  const hhTime = new Date(hh.created_at).getTime() / 1000;
  const candidates = sessions.data.filter(
    (s) =>
      s.mode === "subscription" &&
      s.status === "complete" &&
      s.subscription &&
      (s.metadata?.fund ?? "membership").toLowerCase() === "membership"
  );
  if (!candidates.length) return null;
  candidates.sort((a, b) => Math.abs(a.created - hhTime) - Math.abs(b.created - hhTime));
  const sub = candidates[0].subscription;
  return typeof sub === "string" ? sub : sub.id;
}

async function main() {
  console.log(APPLY ? "APPLY mode: changes will be written.\n" : "DRY RUN: nothing will be written (pass --apply to write).\n");

  const households = await loadHouseholds();
  console.log(`Households with a Stripe customer: ${households.length}\n`);

  const byStatus = {};
  const active = [];
  let renewalPayments = 0;
  let failures = 0;

  for (const hh of households) {
    try {
      const subscriptionId = await findSubscriptionId(hh);
      if (!subscriptionId) {
        byStatus["(one-time / no subscription)"] = (byStatus["(one-time / no subscription)"] || 0) + 1;
        continue;
      }

      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const current_period_end = iso(sub.current_period_end);
      byStatus[sub.status] = (byStatus[sub.status] || 0) + 1;

      const update = { stripe_subscription_id: subscriptionId, subscription_status: sub.status, current_period_end };
      // Extend the membership window if an auto-renewal already moved it past the stored end_date
      if (sub.status === "active" && current_period_end && (!hh.end_date || current_period_end.slice(0, 10) > hh.end_date)) {
        update.end_date = current_period_end.slice(0, 10);
      }
      if (sub.status === "active") active.push({ hh, update });

      // Auto-renewal invoices the webhook previously ignored
      const invoices = await stripe.invoices.list({ subscription: subscriptionId, status: "paid", limit: 100 });
      const renewals = invoices.data.filter((inv) => inv.billing_reason === "subscription_cycle");
      renewalPayments += renewals.length;

      if (APPLY) {
        const upd = await admin.from("membership_households").update(update).eq("id", hh.id);
        if (upd.error) throw upd.error;
        for (const inv of renewals) {
          const pay = await admin.from("membership_payments").upsert(
            {
              household_id: hh.id,
              stripe_session_id: inv.id, // same convention as the webhook's invoice.paid handler
              stripe_payment_intent: typeof inv.payment_intent === "string" ? inv.payment_intent : null,
              amount_cents: inv.amount_paid,
              currency: inv.currency ?? "usd",
              interval: "year",
              status: "succeeded",
            },
            { onConflict: "stripe_session_id" }
          );
          if (pay.error) throw pay.error;
        }
      }
    } catch (e) {
      failures++;
      console.error(`  ! household ${hh.id} (${hh.primary_email ?? "no email"}): ${e?.message ?? e}`);
    }
  }

  console.log("\nSubscription status of households:");
  for (const [status, n] of Object.entries(byStatus).sort()) console.log(`  ${status.padEnd(30)} ${n}`);

  console.log(`\nActive subscriptions (${active.length}) — these will show in the directory:`);
  for (const { hh, update } of active) {
    const ext = update.end_date && update.end_date !== hh.end_date ? `  (end_date ${hh.end_date ?? "—"} -> ${update.end_date})` : "";
    console.log(`  ${(hh.primary_name ?? "—").padEnd(28)} ${(hh.primary_email ?? "—").padEnd(34)} renews ${update.current_period_end?.slice(0, 10) ?? "?"}${ext}`);
  }

  console.log(`\nAuto-renewal payments found: ${renewalPayments}${APPLY ? " (recorded)" : ""}`);
  if (failures) console.log(`Failures: ${failures} (see above)`);
  if (!APPLY) console.log("\nDry run complete. Re-run with --apply to write these changes.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
