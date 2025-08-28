'use client';
import { useSearchParams } from 'next/navigation';

export default function SuccessPage() {
  const sp = useSearchParams();
  const sid = sp.get('session_id');
  return (
    <main className="min-h-screen bg-[#0f2027] text-white flex items-center justify-center px-4">
      <div className="max-w-xl text-center">
        <h1 className="text-3xl font-bold mb-2">Thank you!</h1>
        <p className="text-white/80">
          Your donation was received. May Allah reward you for your generosity.
        </p>
        {sid ? (
          <p className="text-white/50 text-sm mt-2">
            Reference: <code>{sid}</code>
          </p>
        ) : null}
        <a
          href="/donate"
          className="inline-block mt-6 bg-[#FFD700] text-black px-5 py-2 rounded-2xl"
        >
          Make another donation
        </a>
      </div>
    </main>
  );
}
