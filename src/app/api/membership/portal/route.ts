// src/app/api/membership/portal/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBase() {
  const envBase = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (!envBase) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not set");
  }
  return envBase.replace(/\/+$/, ""); // strip trailing slash
}

export async function POST(req: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY!;
  const base = getBase();

  const jar = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (k) => jar.get(k)?.value,
        set: (k, v, o) => jar.set(k, v, o),
        remove: (k, o) => jar.set(k, "", { ...o, maxAge: 0 }),
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
    return NextResponse.redirect(new URL("/modules/registration/membership", base));
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });
  const portal = await stripe.billingPortal.sessions.create({
    customer: m.stripe_customer_id,
    return_url: `${base}/modules/registration/membership/manage`,
  });

  return NextResponse.redirect(portal.url);
}
