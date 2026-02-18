// src/components/admin/RamadanVolunteersButton.tsx
'use client';

import Link from 'next/link';

interface RamadanVolunteersButtonProps {
  href: string;
}

export default function RamadanVolunteersButton({ href }: RamadanVolunteersButtonProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-2xl px-5 py-3 font-medium shadow-md transition
                 bg-[#006400] text-white hover:shadow-lg hover:opacity-90"
    >
      <span className="mr-2">🌙</span>
      Ramadan Volunteers
    </Link>
  );
}
