'use client';

import { useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function AuthCookieSync() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(async (event, session) => {
        await fetch('/api/auth/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event, session }),
        });
      });

    // also sync current session once
    (async () => {
      const { data } = await supabase.auth.getSession();
      await fetch('/api/auth/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'INITIAL', session: data.session }),
      });
    })();

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line

  return null;
}
