'use client';
import Link from 'next/link';

export default function SupportNetworkButton({
  href = '/admin/support-network',
  label = 'Community Support Network',
  className = '',
}: { href?: string; label?: string; className?: string }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={
        'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-white shadow-sm bg-[#006400] hover:opacity-95 ' +
        className
      }
    >
      <span>{label}</span>
    </Link>
  );
}
