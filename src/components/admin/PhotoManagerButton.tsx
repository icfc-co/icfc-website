// FILE: src/components/admin/PhotoManagerButton.tsx
// ----------
'use client';
import Link from 'next/link';

export default function PhotoManagerButton({ href = '/photo-manager', className = '' }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={
        'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-white shadow-sm bg-[#006400] hover:opacity-95 ' +
        className
      }
    >
      {/* camera icon (inline SVG, ASCII only) */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 8h3l2-2h6l2 2h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="14" r="4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span>Photo Manager</span>
    </Link>
  );
}