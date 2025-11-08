// app/elections/2026/membership-review/page.tsx
import SearchVerifier from "./SearchVerifier";

export const revalidate = 0;

export default async function Page() {
  const regClosedOn = "November 4, 2025";
  const reviewWindow = "November 5 – November 6, 2025";
  const nominationFormUrl = "https://forms.gle/REPLACE_WITH_YOUR_FORM"; // update

  return (
    <div className="min-h-screen bg-[#0a4b1a] text-white px-6 py-10 flex flex-col items-center">
      <h1 className="text-4xl font-extrabold text-[#FFD700] mb-3 text-center">
        Membership Registration Closed
      </h1>

      <p className="text-lg mb-6 text-center max-w-3xl">
        Membership registration ended on <b>{regClosedOn}</b>. The <b>review process</b> has now started.
      </p>

      <div className="bg-[#14532d] w-full max-w-6xl p-6 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-semibold text-[#FFE27A] mb-4 text-center">
          Review Window: {reviewWindow}
        </h2>

        <div className="mb-6 text-center">
          <p className="opacity-90">
            Search your <b>full name</b> or <b>email address</b> to confirm your registration status.
          </p>
        </div>

        <SearchVerifier />

      </div>
    </div>
  );
}
