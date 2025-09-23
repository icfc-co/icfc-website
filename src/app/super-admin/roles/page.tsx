"use client";

import { useEffect, useState } from "react";

type UserRow = {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
};

const ALL_ROLES = [
  "super_admin",
  "admin",
  "volunteer",
  "member",
  "teacher",
  "student",
  "user",
];

export default function RolesPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");

  async function loadUsers() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.set("role", roleFilter);
      if (search) params.set("q", search);

      const res = await fetch(`/api/super-admin/users?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setUsers(json.users || []);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(userId: string, role: string) {
    try {
      const res = await fetch(`/api/super-admin/users/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setUsers(prev =>
        prev.map(u => (u.user_id === userId ? { ...u, role } : u))
      );
    } catch (err: any) {
      alert(err.message);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [roleFilter, search]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Manage User Roles</h1>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="border rounded p-2"
        >
          <option value="">All Roles</option>
          {ALL_ROLES.map(r => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <input
          placeholder="Search email or name"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded p-2 flex-1"
        />

        <button
          onClick={loadUsers}
          className="px-4 py-2 bg-black text-white rounded"
        >
          Apply
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Role</th>
              <th className="text-left p-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3" colSpan={4}>
                  Loading…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td className="p-3" colSpan={4}>
                  No users found.
                </td>
              </tr>
            ) : (
              users.map(u => (
                <tr key={u.user_id} className="border-t">
                  <td className="p-2">{u.full_name || "—"}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">
                    <select
                      value={u.role || "user"}
                      onChange={e => changeRole(u.user_id, e.target.value)}
                      className="border rounded p-1"
                    >
                      {ALL_ROLES.map(r => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
