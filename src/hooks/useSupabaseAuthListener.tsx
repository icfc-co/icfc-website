'use client';

import { useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export function useSupabaseAuthListener() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Send session to server so it can set/remove cookies
      await fetch('/api/auth/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: _event, session }),
      });
    });

    return () => subscription.unsubscribe();
  }, [supabase]);
}
