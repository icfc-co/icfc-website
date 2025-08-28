import Link from "next/link";

export const metadata = {
  title: "Thank you | ICFC",
  description: "Donation confirmation",
};

type SearchParams = { m?: string; a?: string; f?: string };

export default function ThanksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const method = (searchParams.m || "stripe").toUpperCase();
  const amountCents = Number(searchParams.a || "0");
  const amount =
    amountCents > 0 ? `$${(amountCents / 100).toFixed(2)}` : "";
  const fund = (searchParams.f || "general").replace(/_/g, " ");

  let methodText = "Stripe payment";
  if (method === "ZELLE") methodText = "Zelle confirmation";
  if (method === "BANK") methodText = "Bank transfer confirmation";

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="max-w-xl w-full p-8 text-center">
        <h1 className="text-3xl font-bold mb-3">Thank you!</h1>

        <p className="mb-4">
          We received your {methodText}
          {amount && <> for <strong>{amount}</strong></>}
          {fund && <> toward <strong>{fund}</strong></>}.
        </p>

        {method !== "STRIPE" && (
          <p className="text-gray-300 mb-6">
            Our team will review and verify it shortly.
            You will receive a receipt if you provided an email.
          </p>
        )}

        <div className="flex gap-3 justify-center">
          <Link href="/donate" className="rounded-2xl bg-yellow-400 text-black px-5 py-2 font-semibold">
            Give again
          </Link>
          <Link href="/" className="rounded-2xl bg-white/10 hover:bg-white/20 px-5 py-2">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
