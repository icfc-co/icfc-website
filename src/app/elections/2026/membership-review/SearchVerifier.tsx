"use client";

import { useState } from "react";

type DisplayRow = {
  name: string;
  headOfHousehold: boolean;
  eligibleToVote: boolean;
  reason: string;
};

type ApiOk =
  | { ok: true; found: false; results: []; message: string }
  | { ok: true; found: true; results: DisplayRow[] };

type ApiErr = { ok: false; error: string };

export default function SearchVerifier() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DisplayRow[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setRows(null);
    if (!query.trim()) return;

    setLoading(true);
    try {
      const r = await fetch("/api/membership/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const json: ApiOk | ApiErr = await r.json();

      if (!json.ok) {
        setError((json as ApiErr).error);
      } else if ("found" in json && !json.found) {
        setMessage("❌ Not found in registered members list.");
      } else {
        setRows((json as Extract<ApiOk, { found: true }>).results);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Enter your full name or email"
          className="px-4 py-3 rounded-xl text-black w-full flex-1 focus:outline-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-[#FFD700] text-[#0a4b1a] px-6 py-3 rounded-xl font-semibold hover:bg-[#ffeb7a] disabled:opacity-60"
        >
          {loading ? "Checking..." : "Check Registration"}
        </button>
      </form>

      {error && (
        <div className="rounded-2xl border p-4 bg-red-900/30 border-red-500 text-red-100 mb-3">
          Error: {error}
        </div>
      )}

      {message && (
        <div className="rounded-2xl border p-4 bg-red-900/30 border-red-500 text-red-100 mb-3">
          {message} If you believe this is an error, please email{" "}
          <a className="underline" href="mailto:elections@icfc.org">
            elections@icfc.org
          </a>.
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-[#185a2f]">
          <table className="min-w-full text-left">
            <thead>
              <tr className="bg-[#166534] text-[#FFE27A]">
                <th className="px-4 py-2 border border-[#185a2f]">Name</th>
                <th className="px-4 py-2 border border-[#185a2f]">Head of Household</th>
                <th className="px-4 py-2 border border-[#185a2f]">Eligible to Vote</th>
                <th className="px-4 py-2 border border-[#185a2f]">Reason (if Not Eligible)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={`${r.name}-${i}`}
                  className={i % 2 === 0 ? "bg-[#0f3f1b]" : "bg-[#14532d]"}
                >
                  <td className="px-4 py-2 border border-[#185a2f]">{r.name}</td>
                  <td className="px-4 py-2 border border-[#185a2f]">
                    {r.headOfHousehold ? "Yes" : "No"}
                  </td>
                  <td
                    className={`px-4 py-2 border border-[#185a2f] font-bold ${
                      r.eligibleToVote ? "text-green-300" : "text-red-300"
                    }`}
                  >
                    {r.eligibleToVote ? "Yes" : "No"}
                  </td>
                  <td className="px-4 py-2 border border-[#185a2f]">{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-center text-gray-200 mt-8 max-w-3xl leading-relaxed">
        If you are a <span className="font-semibold text-[#FFD700]">registered member</span> and do not see your
        name, please reach out to{" "}
        <a href="mailto:elections@icfc.org" className="underline hover:text-[#FFE27A]">elections@icfc.org</a>{" "}
        or contact any member of the <span className="font-semibold">Election Committee</span>.
      </p>
    </div>
  );
}
