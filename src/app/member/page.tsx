'use client';

import Link from 'next/link';

export default function MemberDashboard() {
  return (
    <section className="px-4 py-6">
      <h1 className="text-2xl font-bold">Welcome, Member</h1>
      <p>This is the Member dashboard.</p>

      <div className="mt-6">
        <Link
          href="/modules/registration/membership/manage"
          className="inline-flex items-center rounded-2xl px-5 py-3 font-medium shadow-md transition
                     bg-[#006400] text-white hover:shadow-lg hover:opacity-90"
        >
          Manage Membership
        </Link>
      </div>
      <div className="mt-6">
        <Link
          href="/elections/2026/membership-review"
          className="inline-flex items-center rounded-2xl px-5 py-3 font-medium shadow-md transition
                     bg-[#006400] text-white hover:shadow-lg hover:opacity-90"
        >
          ICFC Elections 2025
        </Link>
      </div>
    </section>
  );
}
