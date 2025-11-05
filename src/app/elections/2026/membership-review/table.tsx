"use client";

import { useState } from "react";

type Row = {
  name: string;
  gender: string;
  eligible: "Yes" | "No";
  reason: string;
};

export default function MembersTable({ rows }: { rows: Row[] }) {
  const [search, setSearch] = useState("");

  const filtered = rows.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="w-full flex justify-end mb-4">
        <input
          type="text"
          placeholder="Search by name..."
          className="px-4 py-2 rounded-xl text-black w-full sm:w-1/3 focus:outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <table className="min-w-full text-left border border-[#185a2f] rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-[#166534] text-[#FFE27A]">
            <th className="px-4 py-2 border border-[#185a2f]">Sr&nbsp;#</th>
            <th className="px-4 py-2 border border-[#185a2f]">Name</th>
            <th className="px-4 py-2 border border-[#185a2f]">Gender</th>
            <th className="px-4 py-2 border border-[#185a2f]">Eligible to Vote</th>
            <th className="px-4 py-2 border border-[#185a2f]">Reason (if Not Eligible)</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td className="px-4 py-4 border border-[#185a2f]" colSpan={5}>
                No members found.
              </td>
            </tr>
          ) : (
            filtered.map((r, i) => (
              <tr
                key={`${r.name}-${i}`}
                className={
                  i % 2 === 0
                    ? "bg-[#0f3f1b] hover:bg-[#1b5132]"
                    : "bg-[#14532d] hover:bg-[#1b5132]"
                }
              >
                <td className="px-4 py-2 border border-[#185a2f] font-semibold text-[#FFD700]">
                  {i + 1}
                </td>
                <td className="px-4 py-2 border border-[#185a2f]">{r.name}</td>
                <td className="px-4 py-2 border border-[#185a2f]">{r.gender}</td>
                <td
                  className={`px-4 py-2 border border-[#185a2f] font-bold ${
                    r.eligible === "Yes" ? "text-green-300" : "text-red-300"
                  }`}
                >
                  {r.eligible}
                </td>
                <td className="px-4 py-2 border border-[#185a2f]">
                  {r.eligible === "No" ? r.reason : ""}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
}
