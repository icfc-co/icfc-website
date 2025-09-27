'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export const prerender = false;         // stop SSG for this page
export const dynamic = 'force-dynamic'; // ensure runtime render

type Dump = {
  documentCookie: string;
  localStorageKeys: string[];
  supaUser: any;
  supaSession: any;
  projectUrl: string;
};

export default function ClientDebug() {
  const [dump, setDump] = useState<Dump | null>(null);

  // ✅ Create the client on the browser without any cookies adapter
  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

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
  }, [supabase]); // ✅ include dependency

  return (
    <main style={{ padding: 20, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
      <h1>Client Debug</h1>
      <div>{JSON.stringify(dump, null, 2)}</div>
    </main>
  );
}
