'use client';

import Link from 'next/link';

export default function MemberDashboard() {
  return (
    <section className="px-4 py-6">
      <h1 className="text-2xl font-bold">Welcome, Member</h1>
      <p>This is your Member dashboard.</p>

      <div className="mt-6">
        <Link
          href="/modules/registration/membership/manage"
          className="inline-flex items-center rounded-2xl px-5 py-3 font-medium shadow-md transition
                     bg-[#006400] text-white hover:shadow-lg hover:opacity-90"
        >
          Manage Membership
        </Link>
      </div>

      <div className="mt-6 max-w-xl rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Community Support Network</h2>
        <p className="mt-1 text-gray-700">
          Need a ride, groceries, a meal, laundry or help around the house? Ask the community.
          Want to help? See what other members need.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/member/support-network/new"
            className="inline-flex items-center rounded-2xl px-5 py-3 font-medium shadow-md transition
                       bg-[#006400] text-white hover:shadow-lg hover:opacity-90"
          >
            Request help
          </Link>
          <Link
            href="/member/support-network"
            className="inline-flex items-center rounded-2xl border border-[#006400] px-5 py-3 font-medium text-[#006400] transition hover:bg-green-50"
          >
            View requests &amp; help others
          </Link>
        </div>
      </div>
      {/* <div className="mt-6">
        <Link
          href="/elections/2026/membership-review"
          className="inline-flex items-center rounded-2xl px-5 py-3 font-medium shadow-md transition
                     bg-[#006400] text-white hover:shadow-lg hover:opacity-90"
        >
          ICFC Elections 2025
        </Link>
      </div> */}
    </section>
  );
}
