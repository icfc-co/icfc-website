// src/app/admin/page.tsx (or wherever AdminDashboard lives)
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient'; // <-- import this

import AdminMessagesButton from '@/components/admin/AdminMessagesButton';
import PhotoManagerButton from '@/components/admin/PhotoManagerButton';
import DonationsManagerButton from '@/components/admin/DonationsManagerButton';

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('is_admin');
      if (!cancelled) setIsAdmin(Boolean(data));
      if (error) console.error('is_admin error:', error);
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
      <p>This is your dashboard.</p>

      <div className="mt-4">
        <AdminMessagesButton />
      </div>
      <div className="mt-6">
        <PhotoManagerButton />
      </div>
      <div className="mt-6">
        <DonationsManagerButton />
      </div>

    </div>
  );
}
