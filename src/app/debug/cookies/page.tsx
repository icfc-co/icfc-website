'use client';
export const prerender = false;         // <-- stop SSG for this page
export const dynamic = 'force-dynamic'; // <-- ensure runtime render

export default function CookiesDump() {
  let keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) keys.push(k!);
    }
  } catch {}
  return (
    <pre style={{ padding: 20 }}>
      {JSON.stringify({
        documentCookie: typeof document !== 'undefined' ? document.cookie : '',
        localStorageKeys: keys.sort(),
        location: typeof window !== 'undefined' ? window.location.href : '',
      }, null, 2)}
    </pre>
  );
}
