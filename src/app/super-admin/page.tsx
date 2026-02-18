'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from "next/link";
import AdminMessagesButton from '@/components/admin/AdminMessagesButton';
import PhotoManagerButton from '@/components/admin/PhotoManagerButton';
import DonationsManagerButton from '@/components/admin/DonationsManagerButton';
import SocialServiceManagerButton from '@/components/admin/SocialServiceManagerButton';
import ManageUserRoleButton from '@/components/admin/ManageUserRoleButton';
import RamadanVolunteersButton from '@/components/admin/RamadanVolunteersButton';

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
       <div className="mt-6">
          <DonationsManagerButton />
       </div>
       <div className="mt-6">
          <SocialServiceManagerButton />
       </div>
       <div className="mt-6">
          <ManageUserRoleButton/>
        </div>
         <div className="mt-6">
        <Link
          href="/admin/members"
          className="inline-flex items-center rounded-2xl px-5 py-3 font-medium shadow-md transition
                     bg-[#006400] text-white hover:shadow-lg hover:opacity-90"
        >
          Members Directory
        </Link>
        </div>

        <div className="mt-6">
          <RamadanVolunteersButton href="/super-admin/ramadan-volunteers" />
        </div>
       
    </div>

  );
}
