import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n) => cookieStore.get(n)?.value,
        set: (n, v, o) => cookieStore.set(n, v, o),
        remove: (n, o) => cookieStore.set(n, "", { ...o, maxAge: 0 }),
      },
    }
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  const { data: sessionData } = await supabase.auth.getSession();
  const cookieNames = cookieStore.getAll().map((c) => c.name);

  return NextResponse.json({
    cookieNames,             // you should see an auth cookie like: sb-<ref>-auth-token
    user,
    userErr,
    session: sessionData?.session ? {
      expires_at: sessionData.session.expires_at,
      token_type: sessionData.session.token_type
    } : null,
    projectUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
  });
}
