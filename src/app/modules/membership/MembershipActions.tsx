// app/modules/membership/MembershipActions.tsx
"use client";

import { useState } from "react";

type Props = { kind: "one_time" | "subscription" };

export default function MembershipActions({ kind }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    try {
      setLoading(true);
      setErr(null);
      const res = await fetch("/api/membership/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Checkout failed");
      if (data?.url) window.location.href = data.url;
      else throw new Error("No checkout URL returned");
    } catch (e: any) {
      setErr(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={start}
        disabled={loading}
        className="w-full inline-flex items-center justify-center rounded-lg px-6 py-3 font-medium text-white
                   bg-green-800 hover:bg-green-900 disabled:opacity-60"
      >
        {loading ? "Redirecting…" : (kind === "subscription" ? "Subscribe Yearly" : "Pay One-time")}
      </button>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
    </div>
  );
}
