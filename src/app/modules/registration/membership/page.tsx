"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";     // disable prerender
export const fetchCache = "force-no-store"; // no caching

export default function Page() {
  const sp = useSearchParams();
  const sessionId = sp.get("session_id") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [household, setHousehold] = useState<any>(null);
  const [members, setMembers]     = useState<any[]>([]);
  const [payment, setPayment]     = useState<any>(null);

  useEffect(() => {
    let tries = 0, stop = false;

    async function tick() {
      try {
        const res = await fetch(`/api/membership/lookup?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
        const json = await res.json();
        if (json.status === "ready") {
          if (stop) return;
          setHousehold(json.household);
          setMembers(json.members);
          setPayment(json.payment);
          setLoading(false);
          setError(null);
          return;
        }
        if (tries++ < 15) setTimeout(tick, 900);
        else {
          setLoading(false);
          setError("We’re still finalizing your membership. Please refresh in a moment.");
        }
      } catch (e: any) {
        setLoading(false);
        setError(e?.message || "Lookup failed");
      }
    }

    if (sessionId) tick();
    else { setLoading(false); setError("Missing session_id."); }

    return () => { stop = true; };
  }, [sessionId]);

  const total = useMemo(() => (payment?.amount_cents ?? 0) / 100, [payment]);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Thank you for your support!</h1>

      {loading && <p>We’re finalizing your membership details…</p>}
      {error && <p className="text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded">{error}</p>}

      {!loading && household && (
        <>
          <div className="border rounded p-4 space-y-1">
            <div className="font-medium">Primary Contact</div>
            <div>{household.primary_name}</div>
            <div>{household.primary_email}</div>
            {household.primary_phone && <div>{household.primary_phone}</div>}
            <div className="text-sm text-gray-600">
              Plan: {payment?.interval === "year" ? "Yearly (recurring)" : "One-time"} · Status: {household.status}
            </div>
            <div className="text-sm">Start: {household.start_date} · End: {household.end_date}</div>
          </div>

          <div className="border rounded p-4">
            <div className="font-medium mb-2">Members</div>
            <ul className="space-y-1">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between">
                  <span>{m.name} · Age {m.age} ({m.membership_type})</span>
                  <span>${((m.price_cents || 0) / 100).toFixed(0)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t pt-3 font-medium">
              Total: ${total.toFixed(0)}
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
