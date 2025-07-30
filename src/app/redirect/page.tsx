'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function RedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const handleRedirect = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        router.push('/login');
        return;
      }

      // Get role ID
      const { data: userRoleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', user.id)
        .single();

      if (roleError || !userRoleData) {
        router.push('/');
        return;
      }

      // Get role name
      const { data: roleData } = await supabase
        .from('roles')
        .select('name')
        .eq('id', userRoleData.role_id)
        .single();

      const role = roleData?.name;

      switch (role) {
        case 'super_admin':
          router.push('/super-admin');
          break;
        case 'admin':
          router.push('/admin');
          break;
        case 'volunteer':
          router.push('/volunteer');
          break;
        case 'teacher':
          router.push('/teacher');
          break;
        case 'student':
          router.push('/student');
          break;
        case 'member':
          router.push('/member');
          break;
        default:
          router.push('/user');
      }
    };

    handleRedirect();
  }, [router]);

  return <p className="text-center mt-10">Redirecting...</p>;
}
