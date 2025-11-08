// app/api/membership/verify/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AnyRow = Record<string, any>;

function coalesce<T>(...vals: (T | null | undefined | "" | number | boolean)[]) {
  for (const v of vals) if (v !== undefined && v !== null && v !== "") return v as T;
  return undefined as unknown as T;
}

function getMembershipType(r: AnyRow): string {
  const raw = coalesce<string>(r.plan_type, r.membership_type, r.type, r.category, r.tier);
  return (raw || "").toString().trim();
}

function eligibleByType(r: AnyRow) {
  const t = getMembershipType(r).toLowerCase();
  if (t.includes("youth")) return { eligible: false, reason: "Youth membership" };
  return { eligible: true, reason: "" };
}

function getDisplayName(r: AnyRow): string {
  const firstLast = [r.first_name, r.last_name].filter(Boolean).join(" ");
  return (r.full_name as string) || (r.name as string) || firstLast || "—";
}

function isHeadOfHousehold(r: AnyRow): boolean {
  // Flexible mapping: prefer explicit booleans, else infer from text
  const val = coalesce<boolean | string | number>(
    r.head_of_household,
    r.is_head_of_household,
    r.household_head,
    r.is_head,
    r.hoh
  );
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val === 1;
  if (typeof val === "string") return ["yes", "true", "1", "head"].includes(val.toLowerCase());
  return false;
}

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    const q = String(query ?? "").trim();
    if (!q) return NextResponse.json({ ok: false, error: "Missing search query." }, { status: 400 });

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const isEmail = q.includes("@");
    const like = `%${q}%`;

    // Select only minimal columns needed for display/logic
    let sel = supabase
      .from("membership_members")
      .select("name,email,membership_type")
      .limit(5);

    if (isEmail) {
      // case-insensitive exact email match preferred
      sel = sel.or(`email.ilike.${q}`);
    } else {
      sel = sel.or(
        [
          `name.ilike.${like}`,
        ].join(",")
      );
    }

    const { data, error } = await sel;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    if (!data || data.length === 0) {
      return NextResponse.json({
        ok: true,
        found: false,
        results: [],
        message: "Not found in registered members list",
      });
    }

    // Map to minimal, privacy-safe rows
    const results = (data as AnyRow[]).map((r) => {
      const { eligible, reason } = eligibleByType(r);
      return {
        name: getDisplayName(r),
        headOfHousehold: isHeadOfHousehold(r),
        eligibleToVote: eligible,
        reason: eligible ? "" : reason,
      };
    });

    return NextResponse.json({ ok: true, found: true, results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
