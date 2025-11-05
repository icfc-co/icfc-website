// app/elections/2026/page.tsx
import Link from "next/link";

export default function Elections2026Landing() {
  return (
    <div className="min-h-screen bg-[#0a4b1a] text-white flex flex-col items-center justify-center px-6 py-10 text-center">
      <h1 className="text-5xl font-extrabold text-[#FFD700] mb-6">
        Membership Registration Closed
      </h1>

      <p className="text-lg max-w-2xl mb-10">
        The membership registration period has ended.  
        The review and nomination process for the ICFC Elections 2026 has now started.
      </p>

      <Link
        href="/elections/2026/membership-review"
        className="bg-[#FFD700] text-[#0a4b1a] px-8 py-4 rounded-2xl text-lg font-semibold shadow-md hover:bg-[#ffeb7a] transition-all"
      >
        Review Membership List & File Nominations
      </Link>

      <p className="text-sm text-gray-300 mt-8">
        Islamic Center of Fort Collins – Elections 2026
      </p>
    </div>
  );
}
