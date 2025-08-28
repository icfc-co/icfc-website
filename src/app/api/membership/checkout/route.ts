// app/api/membership/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY!;
  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });

  const body = await req.json().catch(() => ({} as any));
  const kind = body?.kind === "subscription" ? "subscription" : "one_time";
  const amountCents = Number(body?.amountCents ?? 5000);

  const envBase = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const base = /^https?:\/\//i.test(envBase) ? envBase : `${proto}://${host}`;

  const success_url = new URL("/modules/membership/thanks?session_id={CHECKOUT_SESSION_ID}", base).toString();
  const cancel_url  = new URL("/modules/membership?canceled=1", base).toString();

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (k) => cookieStore.get(k)?.value,
        set: (k, v, o) => cookieStore.set(k, v, o),
        remove: (k, o) => cookieStore.set(k, "", { ...o, maxAge: 0 }),
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: kind === "subscription" ? "subscription" : "payment",
      customer_creation: "always", // ensures Customer exists for one-time too
      success_url,
      cancel_url,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "ICFC Annual Membership" },
            unit_amount: amountCents,
            ...(kind === "subscription" ? { recurring: { interval: "year" } } : {}),
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,               // <-- required by webhook
        membership_type: kind,          // "subscription" | "one_time" (webhook reads this)
        plan: "standard",
        period: "yearly",
        note: String(body?.note ?? ""),
      },
      customer_email: user.email || undefined,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Checkout error" }, { status: 400 });
  }
}
