import { NextResponse } from 'next/server';

export async function GET() {
  const ok =
    !!process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY &&
    !!process.env.STRIPE_SECRET_KEY &&
    !!process.env.STRIPE_WEBHOOK_SECRET;

  return NextResponse.json({
    ok,
    has_pk: !!process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
    has_sk: !!process.env.STRIPE_SECRET_KEY,
    has_whsec: !!process.env.STRIPE_WEBHOOK_SECRET,
  });
}
