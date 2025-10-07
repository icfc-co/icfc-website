// src/app/api/membership/lookup/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const session_id = url.searchParams.get("session_id") || "";

    if (!session_id) {
      return NextResponse.json({ status: "error", error: "Missing session_id" }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ---------- 1) Check if webhook has completed (authoritative path)
    const { data: pay, error: payErr } = await supabaseAdmin
      .from("membership_payments")
      .select("household_id, amount_cents, interval, status, currency, stripe_session_id")
      .eq("stripe_session_id", session_id)
      .maybeSingle();

    if (payErr) {
      return NextResponse.json({ status: "error", error: payErr.message }, { status: 500 });
    }

    if (pay?.household_id) {
      // Load household + members
      const [{ data: household, error: hhErr }, { data: members, error: memErr }] =
        await Promise.all([
          supabaseAdmin
            .from("membership_households")
            .select("id, primary_name, primary_email, primary_phone, status, start_date, end_date")
            .eq("id", pay.household_id)
            .maybeSingle(),
          supabaseAdmin
            .from("membership_members")
            .select("id, name, age, membership_type, price_cents, designation")
            .eq("household_id", pay.household_id)
            .order("designation", { ascending: true }),
        ]);

      if (hhErr) return NextResponse.json({ status: "error", error: hhErr.message }, { status: 500 });
      if (memErr) return NextResponse.json({ status: "error", error: memErr.message }, { status: 500 });

      if (household && members && members.length > 0) {
        const computedTotal = members.reduce((s, m) => s + (m.price_cents ?? 0), 0);
        const payment = {
          amount_cents: computedTotal,
          interval: pay.interval,
          status: pay.status,
          currency: pay.currency ?? "usd",
          stripe_session_id: pay.stripe_session_id,
        };
        return NextResponse.json({ status: "ready", household, members, payment }, { headers: { "Cache-Control": "no-store" } });
      }

      // Household exists but members not yet inserted — still pending
      return NextResponse.json({ status: "pending" }, { headers: { "Cache-Control": "no-store" } });
    }

    // ---------- 2) Webhook not done yet: build a FAST preview (no DB writes)
    // This avoids waiting for webhook when it’s slow, especially on localhost.
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      // Not paid yet, keep polling
      return NextResponse.json({ status: "pending" }, { headers: { "Cache-Control": "no-store" } });
    }

    // Try to show a preview using stored payload
    const payloadId = (session.metadata?.payload_id as string | undefined) || undefined;

    if (payloadId) {
      const { data: row, error: payloadErr } = await supabaseAdmin
        .from("membership_checkout_payloads")
        .select("payload")
        .eq("id", payloadId)
        .maybeSingle();

      if (!payloadErr && row?.payload) {
        const p = row.payload as any;

        const primary = p?.primary || {};
        const membersSrc: any[] = Array.isArray(p?.members) ? p.members : [];
        const members = membersSrc.map((m: any) => ({
          id: crypto.randomUUID(), // preview only; not a DB id
          name: String(m?.name ?? "").trim(),
          age: Number(m?.age ?? 0),
          membership_type: (m?.membership_type ?? "regular") as "student" | "senior" | "regular" | "youth",
          price_cents: 0, // preview total will be computed from pricing if desired; for now 0 to avoid mismatch
          designation: (m?.designation ??
            (membersSrc.indexOf(m) === 0 ? "head_of_household" : "other")) as any,
        }));

        // show something immediate to the user
        const household = {
          id: "preview",
          primary_name: primary?.name || members[0]?.name || "",
          primary_email: primary?.email || null,
          primary_phone: primary?.phone || null,
          status: "active",
          start_date: new Date().toISOString().slice(0, 10),
          end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
            .toISOString()
            .slice(0, 10),
        };

        const payment = {
          amount_cents: p?.total_cents ?? (session.amount_total ?? 0),
          interval: p?.recurrence === "one_time" ? null : "year",
          status: "succeeded",
          currency: session.currency ?? "usd",
          stripe_session_id: session.id,
        };

        // Tell client it’s a preview so it can show a subtle note and keep polling
        return NextResponse.json(
          { status: "preview", household, members, payment },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    // Can’t preview (no payload yet) — keep polling
    return NextResponse.json({ status: "pending" }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ status: "error", error: e?.message || "Server error" }, { status: 500 });
  }
}
