"use client";
import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Row = {
  id: string; created_at: string; requester_name: string; organization: string | null;
  email: string; phone: string | null; requested_datetime: string | null;
  fundraising_goal_cents: number | null; status: string; assigned_to: string | null;
  project_description: string; admin_notes: string | null;
};
type Role = "super_admin"|"admin"|"volunteer"|"user"|"unknown";

export default function SSManage() {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [role, setRole] = useState<Role>("unknown");
  const [q, setQ] = useState(""); const [status, setStatus] = useState<string[]>([]);
  const [mine, setMine] = useState(false);
  const [sel, setSel] = useState<Row | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setRole("unknown");
      const { data } = await supabase.from("user_roles").select("roles(name)").eq("user_id", user.id);
      const names = (data ?? []).map((d: any) => d.roles?.name).filter(Boolean);
      const r: Role = names.includes("super_admin") ? "super_admin"
        : names.includes("admin") ? "admin"
        : names.includes("volunteer") ? "volunteer"
        : "user";
      setRole(r);
    })();
  }, [supabase]);

  const load = async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    status.forEach(s => params.append("status", s));
    if (mine) params.set("mine", "1");

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/social-services?${params.toString()}`, {
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    const json = await res.json();
    if (json?.data) setRows(json.data);
  };
  useEffect(() => { load(); }, []); // initial

  const canApprove = role === "admin" || role === "super_admin";
  const canVolunteerActions = role === "volunteer" || canApprove;

  const updateRow = async (id: string, patch: Partial<Row>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/social-services/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(patch),
    });
    const json = await res.json();
    if (!json?.ok) alert(json?.error || "Update failed");
    await load();
    if (sel?.id === id) setSel(json.data);
  };

  const toUSD = (cents: number | null) => cents == null ? "-" : `$${(cents/100).toLocaleString()}`;

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Manage Social Services</h1>
        <div className="text-sm px-2 py-1 rounded bg-gray-100">Your role: {role}</div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name/org/description…" className="border rounded p-2 w-64"/>
        <select multiple value={status} onChange={e=>setStatus(Array.from(e.target.selectedOptions).map(o=>o.value))} className="border rounded p-2 h-24">
          {["new","in_review","approved","declined","completed","archived"].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <label className="flex items-center gap-2 border rounded px-2"><input type="checkbox" checked={mine} onChange={e=>setMine(e.target.checked)}/> My cases</label>
        <button className="rounded bg-[#006400] text-white px-4" onClick={load}>Apply</button>
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-2">Date</th>
              <th className="p-2">Name / Org</th>
              <th className="p-2">Email / Phone</th>
              <th className="p-2">Requested</th>
              <th className="p-2">Goal</th>
              <th className="p-2">Status</th>
              <th className="p-2">Assignee</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={()=>setSel(r)}>
                <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2">{r.requester_name}{r.organization ? ` – ${r.organization}` : ""}</td>
                <td className="p-2">{r.email}{r.phone ? ` / ${r.phone}` : ""}</td>
                <td className="p-2">{r.requested_datetime ? new Date(r.requested_datetime).toLocaleString() : "-"}</td>
                <td className="p-2">{toUSD(r.fundraising_goal_cents)}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">{r.assigned_to ? "Assigned" : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sel && (
        <div className="fixed inset-0 bg-black/40 flex" onClick={()=>setSel(null)}>
          <div className="ml-auto h-full w-full max-w-xl bg-white p-6 overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">{sel.requester_name}{sel.organization ? ` – ${sel.organization}` : ""}</h2>
              <button onClick={()=>setSel(null)} className="px-3 py-1 rounded border">Close</button>
            </div>
            <p className="text-sm text-gray-600 mb-2">{sel.email} {sel.phone ? `· ${sel.phone}` : ""}</p>
            <p className="whitespace-pre-wrap border rounded p-3 mb-3">{sel.project_description}</p>

            <div className="space-x-2 mb-3">
              {(role === "volunteer" || role === "admin" || role === "super_admin") && (
                <>
                  <button className="px-3 py-1 rounded border" onClick={()=>updateRow(sel.id, { assigned_to: null })}>Unassign</button>
                  <button className="px-3 py-1 rounded border" onClick={async ()=>{
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) await updateRow(sel.id, { assigned_to: user.id, status: sel.status === "new" ? "in_review" : sel.status });
                  }}>Assign to me</button>
                  <button className="px-3 py-1 rounded border" onClick={()=>updateRow(sel.id, { status: "in_review" })}>Mark In-Review</button>
                  <button className="px-3 py-1 rounded border" onClick={()=>updateRow(sel.id, { status: "completed" })}>Mark Completed</button>
                </>
              )}
              {(role === "admin" || role === "super_admin") && (
                <>
                  <button className="px-3 py-1 rounded border" onClick={()=>updateRow(sel.id, { status: "approved" })}>Approve</button>
                  <button className="px-3 py-1 rounded border" onClick={()=>updateRow(sel.id, { status: "declined" })}>Decline</button>
                  <button className="px-3 py-1 rounded border" onClick={()=>updateRow(sel.id, { status: "archived" })}>Archive</button>
                </>
              )}
            </div>

            <label className="text-sm font-medium">Admin / Volunteer Notes</label>
            <textarea
              defaultValue={sel.admin_notes ?? ""}
              onBlur={(e)=>updateRow(sel.id, { admin_notes: e.target.value })}
              className="w-full border rounded p-2 h-28"
              placeholder="Add context, follow-ups, outcomes…"
            />
          </div>
        </div>
      )}
    </main>
  );
}
