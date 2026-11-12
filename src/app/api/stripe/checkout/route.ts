import { NextResponse } from "next/server";
import Stripe from "stripe";
import { resolveDonationEvent } from "@/lib/event-donation";

// Shown on the Stripe payment page
const FUND_LABELS: Record<string, string> = {
  general: "Masjid Expenses (General)",
  zakat: "Zakat",
  cemetery: "Cemetery",
  imam_salary: "Imam/Alim Salary",
  utilities: "Utilities",
  other: "Other",
};

export async function POST(req: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_SECRET_KEY" },
      { status: 500 }
    );
  }

  // Build absolute base URL (works in dev + prod)
  const envBase = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    "localhost:3000";
  const proto =
    req.headers.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");
  const base = /^https?:\/\//i.test(envBase) ? envBase : `${proto}://${host}`;

  const success_url = new URL("/donate/success", base).toString();
  const cancel_url = new URL("/donate?canceled=1", base).toString();

  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });

  try {
    const body = await req.json().catch(() => ({} as any));

    // Gift for a calendar event: the event must exist and accept donations
    let event: Awaited<ReturnType<typeof resolveDonationEvent>> = null;
    try {
      event = await resolveDonationEvent((body as any)?.eventId);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
    const fund = event ? "event" : String((body as any)?.fund ?? "general").toLowerCase();
    // The webhook treats fund "membership" as a membership purchase (household +
    // members), so a donation must never use it. Memberships have their own checkout.
    if (fund === "membership") {
      return NextResponse.json({ error: "Memberships are purchased on the membership registration page." }, { status: 400 });
    }
    const productName = event
      ? `Donation for ${event.title}`
      : `Donation to ICFC — ${FUND_LABELS[fund] ?? fund.replace(/_/g, " ")}`;

    // No login check — userId is optional pass-through from client
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url,
      cancel_url,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: productName },
            unit_amount: Number((body as any)?.amountCents ?? 5000),
          },
          quantity: 1,
        },
      ],
      customer_email: (body as any)?.donorEmail || undefined,
      metadata: {
        fund,
        event_id: event?.id ?? "",
        recurrence: event ? "one_time" : String((body as any)?.recurrence ?? "one_time"),
        donorName: String((body as any)?.donorName ?? ""),
        donorEmail: String((body as any)?.donorEmail ?? ""),
        userId: "", // never trust a client-supplied user id (the donate form doesn't send one)
        note: String((body as any)?.note ?? ""),
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Checkout error" },
      { status: 400 }
    );
  }
}
