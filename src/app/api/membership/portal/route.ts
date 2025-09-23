import { NextResponse } from "next/server";
import Stripe from "stripe";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY!;
  const envBase = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const base = /^https?:\/\//i.test(envBase) ? envBase : `${proto}://${host}`;

  const cookieStore = cookies();
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
  if (!user) return NextResponse.redirect(new URL("/login", base));

  const { data: m, error } = await supabase
    .from("memberships")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !m?.stripe_customer_id) {
    return NextResponse.redirect(new URL("/modules/membership", base));
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });
  const portal = await stripe.billingPortal.sessions.create({
    customer: m.stripe_customer_id,
    return_url: new URL("/modules/registration/membership/manage", base).toString(),
  });

  return NextResponse.redirect(portal.url);
}
