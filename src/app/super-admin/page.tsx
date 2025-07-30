'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

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
    </div>
  );
}
