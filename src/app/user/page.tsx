'use client';

import Link from 'next/link';


export default function UserDashboard() {
  return (
    <section className="px-4 py-6">
      <h1 className="text-2xl font-bold">Welcome, User</h1>
      <p>This is your dashboard.</p>

      <div className="mt-6">
        <Link
          href="/modules/registration/membership"
          className="inline-flex items-center rounded-2xl px-5 py-3 font-medium shadow-md transition
                     bg-[#006400] text-white hover:shadow-lg hover:opacity-90"
        >
          Get Membership
        </Link>
      </div>

    </section>
  );
}
