// scripts/repair-renewed-member-types.mjs
//
// Before the renew route stored a full payload, renewals reached the webhook with
// only name/age/phone/email, so every renewed member was saved as "regular" with
// designation "other". This copies membership_type, designation, sex and
// price_cents back from the household that was renewed, matched by member name.
//
// Dry run (default, writes nothing):
//   node --env-file=.env.local scripts/repair-renewed-member-types.mjs
// Write changes:
//   node --env-file=.env.local scripts/repair-renewed-member-types.mjs --apply
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

const norm = (v) => String(v ?? "").trim().toLowerCase();
const COPY = ["membership_type", "designation", "sex", "price_cents"];

async function main() {
  console.log(APPLY ? "APPLY mode: changes will be written.\n" : "DRY RUN: nothing will be written (pass --apply to write).\n");

  // Old-style renewals: renewal metadata but no payload_id
  const renewals = [];
  for await (const s of stripe.checkout.sessions.list({ limit: 100 })) {
    if (s.status === "complete" && s.metadata?.renewal_of_household_id && !s.metadata?.payload_id) renewals.push(s);
  }
  console.log(`Old-style renewal checkouts found in Stripe: ${renewals.length}\n`);

  let fixedMembers = 0;
  let unmatched = 0;
  let failures = 0;

  for (const s of renewals) {
    const oldHouseholdId = s.metadata.renewal_of_household_id;
    try {
      const { data: pay, error: payErr } = await admin
        .from("membership_payments")
        .select("household_id, amount_cents")
        .eq("stripe_session_id", s.id)
        .maybeSingle();
      if (payErr) throw payErr;
      if (!pay?.household_id) {
        console.log(`  ? session ${s.id}: no household recorded for this renewal (webhook may have failed)`);
        continue;
      }
      const newHouseholdId = pay.household_id;

      const [{ data: oldMembers, error: oErr }, { data: newMembers, error: nErr }] = await Promise.all([
        admin.from("membership_members").select("id, name, email, age, created_at, age_updated_at, " + COPY.join(", ")).eq("household_id", oldHouseholdId),
        admin.from("membership_members").select("id, name, email, age, created_at, age_updated_at, " + COPY.join(", ")).eq("household_id", newHouseholdId),
      ]);
      if (oErr) throw oErr;
      if (nErr) throw nErr;

      console.log(`Household ${newHouseholdId} (renewal of ${oldHouseholdId}, ${s.customer_details?.email ?? "no email"})`);

      for (const nm of newMembers) {
        const candidates = oldMembers.filter((om) => norm(om.name) === norm(nm.name));
        // Same name twice in one household: use email to tell them apart
        const om = candidates.length > 1 ? candidates.find((c) => norm(c.email) === norm(nm.email)) : candidates[0];
        if (!om) {
          unmatched++;
          console.log(`    ? ${nm.name}: no matching member in the previous household, left as ${nm.membership_type}`);
          continue;
        }
        const update = {};
        for (const k of COPY) if (om[k] != null && om[k] !== nm[k]) update[k] = om[k];
        // The old renewal copied last year's age onto a new row; keep it anchored to when it was given
        if (nm.age > 0 && nm.age === om.age && !nm.age_updated_at) update.age_updated_at = om.age_updated_at ?? om.created_at;
        if (!Object.keys(update).length) continue;

        fixedMembers++;
        const desc = Object.entries(update).map(([k, v]) => `${k}: ${nm[k] ?? "—"} -> ${v}`).join(", ");
        console.log(`    ${nm.name}: ${desc}`);
        if (APPLY) {
          const upd = await admin.from("membership_members").update(update).eq("id", nm.id);
          if (upd.error) throw upd.error;
        }
      }

      // The payment total was summed from the wrong (regular) prices; Stripe's charged amount is authoritative
      if (s.amount_total != null && pay.amount_cents !== s.amount_total) {
        console.log(`    payment amount: ${pay.amount_cents} -> ${s.amount_total} cents`);
        if (APPLY) {
          const upd = await admin.from("membership_payments").update({ amount_cents: s.amount_total }).eq("stripe_session_id", s.id);
          if (upd.error) throw upd.error;
        }
      }
    } catch (e) {
      failures++;
      console.error(`  ! session ${s.id}: ${e?.message ?? e}`);
    }
  }

  console.log(`\nMembers ${APPLY ? "corrected" : "to correct"}: ${fixedMembers}`);
  if (unmatched) console.log(`Members with no match (check by hand): ${unmatched}`);
  if (failures) console.log(`Failures: ${failures} (see above)`);
  if (!APPLY) console.log("\nDry run complete. Re-run with --apply to write these changes.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
