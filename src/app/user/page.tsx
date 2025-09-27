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

      <div className="mt-6">
        <Link
      href={/elections}
      prefetch={false}
      className={
        'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-white shadow-sm bg-[#006400] hover:opacity-95 ' +
        className
      }
    >
      
      <span>ICFC Elections 2025</span>
    </Link>
      </div>
    </section>
  );
}
