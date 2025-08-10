"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Switch } from "@headlessui/react";

type Row = {
  id: number;
  parent_key: "services" | "education" | "volunteering" | "community" | "registration";
  key: string;
  name: string;
  href: string;
  order: number | null;
  enabled: boolean;
};

const PARENTS = [
  { key: "services", label: "Services" },
  { key: "education", label: "Education" },
  { key: "volunteering", label: "Volunteering" },
  { key: "community", label: "Community" },
  { key: "registration", label: "Registration" }
] as const;

export default function SubmoduleToggles() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("navbar_submodules")
      .select("id,parent_key,key,name,href,order,enabled")
      .order("parent_key", { ascending: true })
      .order("order", { ascending: true })
      .order("name", { ascending: true });

    if (error) setError(error.message);
    setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();

    const ch = supabase
      .channel("navbar-submodules-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "navbar_submodules" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const byParent = useMemo(() => {
    const map: Record<string, Row[]> = {};
    for (const r of rows) {
      if (!map[r.parent_key]) map[r.parent_key] = [];
      map[r.parent_key].push(r);
    }
    return map;
  }, [rows]);

  const toggle = async (row: Row, to: boolean) => {
    setError(null);
    setSavingId(row.id);

    const prev = rows;
    setRows(prev.map(r => (r.id === row.id ? { ...r, enabled: to } : r)));

    const { error } = await supabase
      .from("navbar_submodules")
      .update({ enabled: to })
      .eq("id", row.id);

    setSavingId(null);
    if (error) {
      setError(error.message);
      setRows(prev); // rollback
    }
  };

  if (loading) {
    return <div className="text-gray-600">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 px-3 py-2 rounded">
          {error}
        </div>
      )}

      {PARENTS.map((p) => (
        <div key={p.key} className="rounded-2xl border border-gray-200 overflow-hidden">
          <div className="bg-[#006400] text-white px-4 py-2 font-medium">{p.label}</div>
          <div className="divide-y divide-gray-100">
            {(byParent[p.key] || []).map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-gray-500">{r.href}</div>
                </div>
                <div className="flex items-center gap-3">
                  {savingId === r.id && <span className="text-xs text-gray-500">Saving...</span>}
                  <Switch
                    checked={r.enabled}
                    onChange={(v) => toggle(r, v)}
                    className={
                      (r.enabled ? "bg-[#006400]" : "bg-gray-200") +
                      " relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                    }
                  >
                    <span
                      className={
                        (r.enabled ? "translate-x-6" : "translate-x-1") +
                        " inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                      }
                    />
                  </Switch>
                </div>
              </div>
            ))}
            {(byParent[p.key]?.length || 0) === 0 && (
              <div className="px-4 py-3 text-sm text-gray-500">No items.</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
