import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import ManageMembershipClient from './ui';

export const dynamic = 'force-dynamic';

export default async function ManageMembershipPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (k) => cookieStore.get(k)?.value,
        set: (k, v, o) => cookieStore.set(k, v, o),
        remove: (k, o) => cookieStore.set(k, '', { ...o, maxAge: 0 }),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <div className="max-w-3xl mx-auto p-6">Please log in to manage your membership.</div>;
  }

  const { data: household } = await supabase
    .from('membership_households')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let members: any[] = [];
  if (household?.id) {
    const { data: mems } = await supabase.from('membership_members').select('*').eq('household_id', household.id);
    members = mems || [];
  }

  return <ManageMembershipClient userId={user.id} household={household} members={members} />;
}
