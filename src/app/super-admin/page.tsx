'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from "next/link";
import AdminMessagesButton from '@/components/admin/AdminMessagesButton';
import PhotoManagerButton from '@/components/admin/PhotoManagerButton';

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', user.id)
        .single();

      const { data: role } = await supabase
        .from('roles')
        .select('name')
        .eq('id', userRole?.role_id)
        .single();

      if (role?.name !== 'super_admin') {
        router.push('/');
      } else {
        setLoading(false);
      }
    };

    checkAccess();
  }, [router]);

  if (loading) return <p className="p-4">Checking access...</p>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Welcome, Super Admin</h1>
      <p>This is your dashboard.</p>

       <div className="mt-6">
          <Link
            href="/super-admin/submenus"
            className="inline-block bg-[#006400] text-white px-4 py-2 rounded hover:bg-green-800"
          >
            Manage Nav Sub‑menus
          </Link>
       </div>
       <div className="mt-4">
        <AdminMessagesButton />
       </div>
       <div className="mt-6">
          <PhotoManagerButton />
       </div>
       <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <a
            href="/admin/donations"
            className="rounded-2xl border bg-white p-6 shadow hover:shadow-md transition"
          >
            <div className="text-xl font-medium mb-1">Donations</div>
            <p className="text-slate-600 text-sm">
              Review Stripe, Zelle, and Bank entries, verify pending ones, and export CSV.
            </p>
          </a>

          {/* Add more cards here when ready */}
        </div>
        <Link href="/admin/social-services" className="inline-block rounded-2xl bg-[#006400] text-white px-4 py-2">
  Manage Social Services
</Link>
    </div>

  );
}
