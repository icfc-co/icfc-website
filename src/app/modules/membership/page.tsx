import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import MembershipActions from "./MembershipActions";

export const dynamic = "force-dynamic";

export default async function MembershipPage() {
  const cookieStore = await cookies(); // ← await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (k) => cookieStore.get(k)?.value,
        set: (k, v, o) => cookieStore.set(k, v, o),
        remove: (k, o) => cookieStore.set(k, "", { ...o, maxAge: 0 }),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h1 className="text-3xl font-bold mb-3">ICFC Membership</h1>
        <p className="opacity-80 mb-6">Please sign in to purchase your membership.</p>
        <a href="/login" className="inline-block rounded-lg px-6 py-2 bg-green-800 text-white">
          Login (myPortal)
        </a>
      </section>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  const profileName = profile?.name || "";

  return (
    <section className="max-w-5xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight mb-3" style={{ color: "#006400" }}>
          Become an ICFC Member
        </h1>
        <p className="text-gray-700">Your membership keeps our mosque programs running strong.</p>
      </div>

      <div className="mb-8 rounded-2xl border p-5 bg-white shadow-sm">
        <h2 className="text-xl font-semibold mb-2">Your Details</h2>
        <div className="text-gray-800">
          <div><span className="font-medium">Name:</span> {profileName || "—"}</div>
          <div><span className="font-medium">Email:</span> {user.email}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border p-6 bg-white shadow-sm">
          <h3 className="text-2xl font-bold mb-2">One-time Membership</h3>
          <p className="mb-4 text-gray-700">Pay once for this year. Does not auto-renew.</p>
          <div className="text-4xl font-extrabold mb-6">$50</div>
          <MembershipActions kind="one_time" />
        </div>

        <div className="rounded-2xl border p-6 bg-white shadow-sm">
          <h3 className="text-2xl font-bold mb-2">Yearly Subscription</h3>
          <p className="mb-4 text-gray-700">Billed automatically every year. Cancel anytime.</p>
          <div className="text-4xl font-extrabold mb-6">$50<span className="text-base font-medium">/year</span></div>
          <MembershipActions kind="subscription" />
        </div>
      </div>
    </section>
  );
}
