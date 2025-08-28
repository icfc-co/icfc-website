import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StartMembershipGate() {
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
  if (!user) redirect("/login");

  const { data: memberRole } = await supabase
    .from("roles")
    .select("id")
    .eq("name", "member")
    .maybeSingle();

  if (!memberRole) redirect("/modules/membership");

  const { data: ur } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", user.id)
    .eq("role_id", memberRole.id)
    .maybeSingle();

  if (ur) redirect("/modules/membership/manage");
  redirect("/modules/membership");
}
