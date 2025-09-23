import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

function fmt(dt?: string | null) {
  if (!dt) return "—";
  const d = new Date(dt);
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });
}

export default async function ManageMembershipPage() {
  const cookieStore = await cookies(); // fix warning: await cookies()
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
        <h1 className="text-3xl font-bold mb-3">Manage Membership</h1>
        <p className="opacity-80 mb-6">Please sign in.</p>
        <a href="/login" className="inline-block rounded-lg px-6 py-2 bg-green-800 text-white">
          Login
        </a>
      </section>
    );
  }

  const { data: m } = await supabase
    .from("memberships")
    .select("status, plan, period, amount_cents, plan_type, start_date, end_date, stripe_customer_id, stripe_subscription_id, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const isSubscribed = Boolean(m?.stripe_subscription_id);
  const amount = (m?.amount_cents ?? 0) / 100;

  return (
    <section className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Manage Membership</h1>

      <div className="mt-4 grid gap-4">
        {/* Status Card */}
        <div className="rounded-2xl border p-5 bg-white shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div className="text-lg font-semibold capitalize">{m?.status ?? "—"}</div>
            </div>
            <div className="flex gap-3">
              {isSubscribed ? (
                <form action="/api/membership/portal" method="POST">
                  <button className="rounded-lg px-5 py-2 bg-green-800 text-white hover:bg-green-900">
                    Manage Billing (Stripe)
                  </button>
                </form>
              ) : (
                <a href="/modules/registration/membership" className="rounded-lg px-5 py-2 bg-green-800 text-white hover:bg-green-900">
                  Get / Renew Membership
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Details Card */}
        <div className="rounded-2xl border p-5 bg-white shadow-sm">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">Plan</div>
              <div className="font-medium capitalize">{m?.plan ?? "standard"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Billing</div>
              <div className="font-medium capitalize">{m?.period ?? "yearly"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Type</div>
              <div className="font-medium">{m?.plan_type ?? (isSubscribed ? "subscription" : "one_time")}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Amount</div>
              <div className="font-medium">${amount.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Start date</div>
              <div className="font-medium">{fmt(m?.start_date)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">End / Next renewal</div>
              <div className="font-medium">{fmt(m?.end_date)}</div>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            Last updated: {fmt(m?.updated_at)}
          </div>
        </div>
      </div>
    </section>
  );
}
