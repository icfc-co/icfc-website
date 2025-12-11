// src/app/admin/page.tsx
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AdminMessagesButton from '@/components/admin/AdminMessagesButton';
import PhotoManagerButton from '@/components/admin/PhotoManagerButton';
import DonationsManagerButton from '@/components/admin/DonationsManagerButton';
import SocialServiceManagerButton from '@/components/admin/SocialServiceManagerButton';

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

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

  if (isAdmin === null) return <div className="p-8">Loading…</div>;

  if (!isAdmin) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-red-600 mt-2">You are not authorized to view admin tools.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Welcome, Admin</h1>
      {/* your buttons/links */}
      
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
        <Link
          href="/admin/members"
          className="inline-flex items-center rounded-2xl px-5 py-3 font-medium shadow-md transition
                     bg-[#006400] text-white hover:shadow-lg hover:opacity-90"
        >
          Members Directory
        </Link>
        </div>
    </div>
  );
}
