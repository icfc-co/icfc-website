// (your existing file) – only small edits marked with 🔧
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Member = {
  id: string;
  name: string;
  age: number;
  membership_type: "student" | "senior" | "regular" | "youth";
  price_cents: number;
  designation:
    | "head_of_household"
    | "spouse"
    | "father_or_father_in_law"
    | "mother_or_mother_in_law"
    | "son_or_son_in_law"
    | "daughter_or_daughter_in_law"
    | "other";
};

const label = (d: Member["designation"]) =>
  ({
    head_of_household: "Head of Household",
    spouse: "Spouse",
    father_or_father_in_law: "Father / Father-in-Law",
    mother_or_mother_in_law: "Mother / Mother-in-Law",
    son_or_son_in_law: "Son / Son-in-Law",
    daughter_or_daughter_in_law: "Daughter / Daughter-in-Law",
    other: "Other",
  }[d] || "Other");

export default function ThanksClient() {
  const sp = useSearchParams();
  const sessionId = sp.get("session_id") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [household, setHousehold] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [payment, setPayment] = useState<any>(null);
  const [isPreview, setIsPreview] = useState(false); // 🔧

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      setError("Missing session_id.");
      return;
    }

    let tries = 0;
    let stop = false;

    const tick = async () => {
      if (stop) return;
      try {
        const res = await fetch(
          `/api/membership/lookup?session_id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" }
        );
        const json = await res.json();

        if (json.status === "ready") {
          setHousehold(json.household);
          setMembers(json.members || []);
          setPayment(json.payment || null);
          setIsPreview(false); // 🔧
          setLoading(false);
          setError(null);
          return;
        }

        if (json.status === "preview") {
          // show data immediately, but keep polling until 'ready'
          setHousehold(json.household);
          setMembers(json.members || []);
          setPayment(json.payment || null);
          setIsPreview(true); // 🔧
          setLoading(false);
          setError(null);

          if (tries++ < 40) setTimeout(tick, 1500);
          return;
        }

        if (json.status === "error") {
          setLoading(false);
          setError(json.error || "Lookup error");
          return;
        }

        // pending: poll with gentle backoff
        if (tries++ < 40) {
          const delay = tries < 6 ? 800 : 1500; // faster early 🔧
          setTimeout(tick, delay);
        } else {
          setLoading(false);
          setError("We’re still finalizing your membership. Please refresh in a moment.");
        }
      } catch (e: any) {
        setLoading(false);
        setError(e?.message || "Lookup failed");
      }
    };

    tick();
    return () => { stop = true; };
  }, [sessionId]);

  const total = useMemo(() => {
    if (payment?.amount_cents != null) return payment.amount_cents / 100;
    return members.reduce((s, m) => s + (m.price_cents ?? 0), 0) / 100;
  }, [payment, members]);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Thank you for your support!</h1>

      {loading && <p>We’re finalizing your membership details…</p>}

      {error && (
        <p className="text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded">
          {error}
        </p>
      )}

      {!loading && household && (
        <>
          {isPreview && (
            <p className="text-xs text-gray-600">
              Showing confirmation preview — your receipt will finalize shortly.
            </p>
          )}

          <div className="border rounded p-4 space-y-1">
            <div className="font-medium">Primary Contact</div>
            <div className="capitalize">{household.primary_name}</div>
            {household.primary_email && <div>{household.primary_email}</div>}
            {household.primary_phone && <div>{household.primary_phone}</div>}
            <div className="text-sm text-gray-600">
              Plan: {payment?.interval === "year" ? "Yearly (recurring)" : "One-time"} · Status: {household.status}
            </div>
            <div className="text-sm">
              Start: {household.start_date} · End: {household.end_date}
            </div>
          </div>

          <div className="border rounded p-4">
            <div className="font-medium mb-2">Members</div>
            <ul className="space-y-2">
              {members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                      {label(m.designation)}
                    </span>
                    <span className="text-gray-600">· Age {m.age}</span>
                    <span className="text-gray-600">({m.membership_type})</span>
                  </div>
                  {!isPreview && <span className="font-medium">${(m.price_cents / 100).toFixed(0)}</span>}
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t pt-3 font-medium">
              Total: ${total.toFixed(0)}
              {isPreview && <span className="text-xs text-gray-500"> (pending finalization)</span>}
            </div>
          </div>
        </>
      )}

      {!loading && !household && !error && (
        <p>We couldn’t find your membership yet. Please refresh this page in a minute.</p>
      )}
    </div>
  );
}
