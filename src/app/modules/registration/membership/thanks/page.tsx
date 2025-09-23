import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export default async function ThanksPage({ searchParams }: { searchParams?: { session_id?: string } }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (k) => cookieStore.get(k)?.value,
        set: (k, v, o) => cookieStore.set(k, v, o),
        remove: (k, o) => cookieStore.set(k, "", { ...o, maxAge: 0 }),
      },
    }
  );

  const sessionId = searchParams?.session_id || "";

  // Try to finalize once (server-side fetch)
  let finalized: any = null;
  if (sessionId) {
    try {
      const base = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "";
      const origin =
        /^https?:\/\//i.test(base)
          ? base
          : `http://localhost:${process.env.PORT || "3000"}`;
      const res = await fetch(`${origin}/api/membership/finalize?session_id=${encodeURIComponent(sessionId)}`, {
        cache: "no-store",
      });
      finalized = await res.json();
    } catch (e) {
      // ignore; page still renders
    }
  }

  return (
    <section className="max-w-2xl mx-auto px-6 py-16 text-center">
      <h1 className="text-3xl font-bold mb-4">JazakAllahu Khairan!</h1>
      <p className="mb-6">Thank you for becoming a member of ICFC.</p>

      {finalized?.ok ? (
        <div className="text-sm text-left bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="font-semibold mb-1">Membership finalized:</div>
          <div>Status: <strong>{finalized.membership?.status}</strong></div>
          <div>Plan: <strong>{finalized.membership?.plan}</strong></div>
          <div>Period: <strong>{finalized.membership?.period}</strong></div>
          <div>Type: <strong>{finalized.membership?.plan_type}</strong></div>
          <div>Start: <strong>{new Date(finalized.membership?.start_date || "").toLocaleString()}</strong></div>
          <div>End/Next: <strong>{new Date(finalized.membership?.end_date || "").toLocaleString()}</strong></div>
          <div className="mt-2">Role now: <strong>{finalized.role?.roles?.name}</strong></div>
        </div>
      ) : sessionId ? (
        <div className="text-sm text-left bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="font-semibold mb-1">We’re finalizing your membership…</div>
          <div>Session: {sessionId}</div>
          {finalized?.error && <div className="text-red-600 mt-2">Error: {finalized.error}</div>}
        </div>
      ) : null}

      <a href="/member" className="inline-block px-6 py-2 rounded-lg bg-green-800 text-white hover:bg-green-900">
        Go to My Dashboard
      </a>
    </section>
  );
}
