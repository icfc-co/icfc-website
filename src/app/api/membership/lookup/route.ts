// src/app/api/membership/lookup/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const session_id = url.searchParams.get("session_id");
  if (!session_id) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "public" } }
  );

  const { data: pay } = await admin
    .from("membership_payments")
    .select("*, household:household_id(*)")
    .eq("stripe_session_id", session_id)
    .maybeSingle();

  if (!pay) return NextResponse.json({ status: "pending" });

  const { data: members } = await admin
    .from("membership_members")
    .select("*")
    .eq("household_id", pay.household_id);

  return NextResponse.json({
    status: "ready",
    payment: pay,
    household: pay.household,
    members: members ?? [],
  });
}
