// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const whsec  = process.env.STRIPE_WEBHOOK_SECRET;
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaSrv = process.env.SUPABASE_SERVICE_ROLE;

  if (!secret || !whsec || !supaUrl || !supaSrv) {
    console.error("Missing env", { hasSK: !!secret, hasWH: !!whsec, hasURL: !!supaUrl, hasSRV: !!supaSrv });
    return new NextResponse("Server misconfigured", { status: 500 });
  }

  const stripe = new Stripe(secret, { apiVersion: "2024-06-20" });

  // RAW body is required for Stripe signature verification
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") || "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whsec);
  } catch (err: any) {
    console.error("Bad signature:", err.message);
    return new NextResponse("Bad signature", { status: 400 });
  }

  console.log("WEBHOOK:", event.type);

  const supabase = createClient(supaUrl, supaSrv);

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const meta = session.metadata || {};
      const amountCents =
        (session.amount_total ?? session.amount_subtotal ?? 0);

      const { error } = await supabase.from("donations").insert({
        user_id: meta.userId || null,
        donor_name: meta.donorName || null,
        donor_email: session.customer_details?.email || null,
        method: "stripe",
        status: "succeeded",
        amount_cents: amountCents,
        currency: session.currency || "usd",
        fund: (meta.fund as string) || "general",
        recurrence: (meta.recurrence as "one_time" | "monthly") || "one_time",
        note: meta.note || null,
        external_ref: session.id,
      });

      if (error) {
        console.error("Supabase insert error:", error);
        return NextResponse.json({ ok: false }, { status: 500 });
      }
    }

    // (Optional) handle subscription renewals:
    // if (event.type === "invoice.paid") { ... }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Webhook handler error:", e);
    return new NextResponse("Webhook error", { status: 500 });
  }
}
