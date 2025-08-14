'use client';
import Link from 'next/link';

export default function AdminMessagesButton({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/admin/messages"
      prefetch={false}
      className={
        'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-white shadow-sm bg-[#006400] hover:opacity-95 ' +
        className
      }
    >
      {/* mail-inbox icon (inline SVG, ASCII only) */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M21 8v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 8l6.6 4.4a4 4 0 0 0 4.8 0L21 8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 8h10" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span>Admin Messages</span>
    </Link>
  );
}
