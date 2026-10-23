// src/lib/membershipPricing.ts
// Shared membership pricing / ageing rules for renewals (manual and Stripe auto-renewal).
import type { SupabaseClient } from "@supabase/supabase-js";

export type PricingRow = { type: string; amount_cents: number; min_age: number | null; max_age: number | null };
export type PricingMap = Record<string, PricingRow>;

export async function loadActivePricing(client: SupabaseClient): Promise<PricingMap> {
  const { data, error } = await client
    .from("membership_pricing")
    .select("type, amount_cents, min_age, max_age")
    .eq("is_active", true);
  if (error || !data?.length) throw new Error(error?.message || "Pricing not available");
  return Object.fromEntries(data.map((p: PricingRow) => [p.type, p]));
}

// Youth members past the youth max age (from membership_pricing) become regular members
export function typeForAge(type: string, age: number, pricing: PricingMap): string {
  const max = pricing["youth"]?.max_age;
  return type === "youth" && max != null && age > max ? "regular" : type;
}

export function amountFor(type: string, age: number, pricing: PricingMap): number {
  return pricing[typeForAge(type, age, pricing)]?.amount_cents ?? 0;
}

// Members store the age they gave at a point in time (age_updated_at, else the row's created_at).
// Whole membership years elapsed since then are added; renewing a few months early or late
// still counts as one year.
// Some members prefer not to give their age and enter 0: that is "not given", never aged.
export function ageAt(age: number, since: string | null | undefined, at: Date = new Date()): number {
  if (!since || !(age > 0)) return age;
  const years = Math.round((at.getTime() - new Date(since).getTime()) / (365.25 * 24 * 3600 * 1000));
  return age + Math.max(0, years);
}
