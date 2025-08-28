'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type Dump = {
  documentCookie: string;
  localStorageKeys: string[];
  supaUser: any;
  supaSession: any;
  projectUrl: string;
};

export default function ClientDebug() {
  const [dump, setDump] = useState<Dump | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { name: undefined, lifetime: 60 * 60 * 24 * 365, path: '/', sameSite: 'lax' } }
  );

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: sessionData } = await supabase.auth.getSession();
      const keys: string[] = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) keys.push(k);
        }
      } catch {}

      setDump({
        documentCookie: document.cookie,
        localStorageKeys: keys.sort(),
        supaUser: user ?? null,
        supaSession: sessionData?.session ?? null,
        projectUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!
      });
    })();
  }, []);

  return (
    <main style={{ padding: 20, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
      <h1>Client Debug</h1>
      <div>{JSON.stringify(dump, null, 2)}</div>
    </main>
  );
}
