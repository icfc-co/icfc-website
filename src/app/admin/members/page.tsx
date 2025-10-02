"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

// =============================
// Admin Members Directory Page
// =============================
// Schema assumed from your screenshots:
// - public.membership_members: id, household_id, name, email, phone, age, membership_type, created_at
// - public.membership_households: id, primary_name, primary_email, primary_phone
// FK: membership_members.household_id → membership_households.id
// (constraint name: membership_members_household_id_fkey)

export type Member = {
  id: string;
  household_id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  age?: number | null;
  membership_type?: string | null; // youth | student | regular | senior
  created_at?: string | null;
  household?: {
    id: string;
    primary_name?: string | null;
    primary_email?: string | null;
    primary_phone?: string | null;
  } | null;
};

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function classNames(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

// ---- Age presets (tweak as needed)
const AGE_PRESETS: { label: string; min?: number; max?: number }[] = [
  { label: "Under 13", max: 12 },
  { label: "13–17", min: 13, max: 17 },
  { label: "18–25", min: 18, max: 25 },
  { label: "26–40", min: 26, max: 40 },
  { label: "41–60", min: 41, max: 60 },
  { label: "60+", min: 61 },
];

// ---- Member types (from membership_members.membership_type)
const MEMBER_TYPES = [
  { key: "youth", label: "Youth" },
  { key: "student", label: "Student" },
  { key: "regular", label: "Regular" },
  { key: "senior", label: "Senior" },
] as const;

type MemberTypeKey = (typeof MEMBER_TYPES)[number]["key"];

export default function AdminMembersDirectory() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [ageMin, setAgeMin] = useState<number | undefined>(undefined);
  const [ageMax, setAgeMax] = useState<number | undefined>(undefined);
  const [selectedMemberTypes, setSelectedMemberTypes] = useState<MemberTypeKey[]>([]);
  const [primaryName, setPrimaryName] = useState("");
  const [primaryEmail, setPrimaryEmail] = useState("");

  // Data & paging
  const [rows, setRows] = useState<Member[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  const searchRef = useRef<number | null>(null);

  // Admin gate
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        if (!cancelled) setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase.rpc('is_admin', { uid: user.id });

      if (error) {
        console.error('is_admin error:', error);
        if (!cancelled) setIsAdmin(false);
        return;
      }

      if (!cancelled) setIsAdmin(Boolean(data));
    })();

    return () => { cancelled = true; };
  }, []);

  // Active filter summary
  const activeFiltersText = useMemo(() => {
    const bits: string[] = [];
    if (ageMin != null || ageMax != null) bits.push(`Age ${ageMin ?? "0"}${ageMax ? "–" + ageMax : "+"}`);
    if (selectedMemberTypes.length) bits.push(`Member type: ${selectedMemberTypes.join(", ")}`);
    if (primaryName.trim()) bits.push(`Primary name: “${primaryName.trim()}”`);
    if (primaryEmail.trim()) bits.push(`Primary email: “${primaryEmail.trim()}”`);
    if (search.trim()) bits.push(`Search: “${search.trim()}”`);
    return bits.join(" · ");
  }, [ageMin, ageMax, search, selectedMemberTypes, primaryName, primaryEmail]);

  // Fetch list when filters/page change
  useEffect(() => {
    if (isAdmin === false || isAdmin === null) return;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const needsHHFilter = Boolean(primaryName.trim() || primaryEmail.trim());
        const householdJoin = needsHHFilter ? "membership_households!inner" : "membership_households";

        let query = supabase
          .from("membership_members")
          .select(
            `id,name,email,phone,age,membership_type,household_id,created_at,
             household:${householdJoin}(
               id,primary_name,primary_email,primary_phone
             )`,
            { count: "exact" }
          );

        // Filters
        if (ageMin != null) query = query.gte("age", ageMin);
        if (ageMax != null) query = query.lte("age", ageMax);

        const s = search.trim();
        if (s) {
          const like = `%${s}%`;
          query = query.or([`name.ilike.${like}`, `email.ilike.${like}`].join(","));
        }

        if (selectedMemberTypes.length) {
          query = query.in("membership_type", selectedMemberTypes as string[]);
        }

        if (primaryName.trim()) {
          query = query.ilike("membership_households.primary_name", `%${primaryName.trim()}%`);
        }
        if (primaryEmail.trim()) {
          query = query.ilike("membership_households.primary_email", `%${primaryEmail.trim()}%`);
        }

        // Sort & page
        query = query.order("name", { ascending: true });
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const { data, error, count } = await query.range(from, to);
        if (error) throw error;
        setRows((data as any as Member[]) || []);
        setTotal(count || 0);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load members");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [isAdmin, ageMin, ageMax, search, selectedMemberTypes, primaryName, primaryEmail, page, pageSize]);

  // Debounced search typing
  function onSearchChange(v: string) {
    setSearch(v);
    if (searchRef.current) window.clearTimeout(searchRef.current);
    searchRef.current = window.setTimeout(() => setPage(1), 300);
  }

  function applyAgePreset(p: { label: string; min?: number; max?: number }) {
    setPage(1);
    setAgeMin(p.min);
    setAgeMax(p.max);
  }

  function toggleMemberType(k: MemberTypeKey) {
    setPage(1);
    setSelectedMemberTypes((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }

  function clearAllFilters() {
    setAgeMin(undefined);
    setAgeMax(undefined);
    setSearch("");
    setSelectedMemberTypes([]);
    setPrimaryName("");
    setPrimaryEmail("");
    setPage(1);
  }

  function exportCSV() {
    const header = [
      "Name",
      "Email",
      "Age",
      "Household",
      "Primary Name",
      "Primary Email",
      "Member Type",
      "Phone",
      "Created At",
    ];
    const lines = rows.map((m) =>
      [
        m.name || "",
        m.email || "",
        m.age ?? "",
        m.household?.id || "",
        m.household?.primary_name || "",
        m.household?.primary_email || "",
        m.membership_type || "",
        m.phone || "",
        m.created_at || "",
      ]
        .map((x) => `"${String(x).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `members_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (isAdmin === null) return <div className="p-6 text-gray-500">Checking admin access…</div>;
  if (!isAdmin)
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">You don’t have permission to view this page.</div>
      </div>
    );

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Members Directory</h1>
          <p className="text-sm text-gray-500">View members with household details.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportCSV} className="rounded-xl border px-3 py-2 text-sm shadow-sm hover:bg-gray-50">
            Export CSV
          </button>
          <button onClick={clearAllFilters} className="rounded-xl border px-3 py-2 text-sm shadow-sm hover:bg-gray-50">
            Clear filters
          </button>
        </div>
      </header>

      {/* Filters */}
      <section className="grid grid-cols-1 gap-4 rounded-2xl border bg-white p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-4">
        {/* Search */}
        <div className="col-span-1 sm:col-span-1 lg:col-span-2">
          <label className="block text-xs font-medium text-gray-600">Search (name or email)</label>
          <input
            type="text"
            placeholder="e.g., Sarah Khan or sarah@…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring"
          />
        </div>

        {/* Age presets */}
        <div className="col-span-1">
          <label className="block text-xs font-medium text-gray-600">Age presets</label>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {AGE_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyAgePreset(p)}
                className={classNames(
                  "truncate rounded-lg border px-2 py-1 text-xs",
                  ageMin === p.min && ageMax === p.max ? "border-green-600 bg-green-50 text-green-700" : "hover:bg-gray-50"
                )}
                title={p.label}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              value={ageMin ?? ""}
              onChange={(e) => setAgeMin(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Min"
              className="w-20 rounded-lg border px-2 py-1 text-xs"
            />
            <span className="text-xs text-gray-500">to</span>
            <input
              type="number"
              value={ageMax ?? ""}
              onChange={(e) => setAgeMax(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Max"
              className="w-20 rounded-lg border px-2 py-1 text-xs"
            />
          </div>
        </div>

        {/* Member types */}
        <div className="col-span-1">
          <label className="block text-xs font-medium text-gray-600">Member type</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {MEMBER_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => toggleMemberType(t.key)}
                className={classNames(
                  "rounded-full border px-3 py-1 text-xs",
                  selectedMemberTypes.includes(t.key)
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "hover:bg-gray-50"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Household primary search */}
        <div className="col-span-1">
          <label className="block text-xs font-medium text-gray-600">Primary name (household)</label>
          <input
            type="text"
            placeholder="e.g., Mohammad"
            value={primaryName}
            onChange={(e) => {
              setPrimaryName(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring"
          />
          <label className="mt-3 block text-xs font-medium text-gray-600">Primary email (household)</label>
          <input
            type="text"
            placeholder="e.g., primary@email.com"
            value={primaryEmail}
            onChange={(e) => {
              setPrimaryEmail(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring"
          />
        </div>
      </section>

      {/* Active filters summary */}
      <div className="text-xs text-gray-500 min-h-[1rem]">{activeFiltersText}</div>

      {/* Table */}
      <section className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-gray-600">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Household</th>
              <th className="px-4 py-3">Primary Name</th>
              <th className="px-4 py-3">Primary Email</th>
              <th className="px-4 py-3">Member Type</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-gray-500">Loading members…</td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-red-600">{error}</td>
              </tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-gray-500">No members found.</td>
              </tr>
            )}
            {!loading && !error &&
              rows.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{m.name || "—"}</td>
                  <td className="px-4 py-3 text-blue-700">{m.email || "—"}</td>
                  <td className="px-4 py-3">{m.age ?? "—"}</td>
                  <td className="px-4 py-3">{m.household?.id || "—"}</td>
                  <td className="px-4 py-3">{m.household?.primary_name || "—"}</td>
                  <td className="px-4 py-3">{m.household?.primary_email || "—"}</td>
                  <td className="px-4 py-3 capitalize">{m.membership_type || "—"}</td>
                  <td className="px-4 py-3">{m.phone || "—"}</td>
                  <td className="px-4 py-3">{m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      {/* Pagination */}
      <section className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="text-xs text-gray-500">
          Showing <strong>{rows.length}</strong> of <strong>{total}</strong> members · Page {page} / {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-xl border px-3 py-2 text-sm disabled:opacity-50">
            Prev
          </button>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-xl border px-3 py-2 text-sm disabled:opacity-50">
            Next
          </button>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="ml-2 rounded-xl border px-2 py-2 text-sm"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        </div>
      </section>
    </div>
  );
}
