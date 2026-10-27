import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const runtime = "nodejs";       // optional but recommended
export const dynamic = "force-dynamic";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function POST(req: Request) {
  // In Route Handlers, cookies() must be awaited
  const cookieStore = await cookies();

  // We’ll write any Supabase-auth cookie updates onto this response
  const res = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Supabase SSR helper expects these two “batch” functions
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { event, session } = (await req.json().catch(() => ({}))) as {
    event?: string;
    session?: any;
  };

  // Keep parity with Supabase’s onAuthStateChange events
  if (event === "SIGNED_OUT") {
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    // signOut() can bail out before clearing cookies (e.g. session already revoked by the
    // browser), which left the previous account's session for middleware; expire them here.
    for (const c of cookieStore.getAll()) {
      if (c.name.startsWith("sb-")) res.cookies.set(c.name, "", { path: "/", maxAge: 0 });
    }
  } else if (
    event === "SIGNED_IN" ||
    event === "TOKEN_REFRESHED" ||
    event === "USER_UPDATED"
  ) {
    if (session) {
      await supabase.auth.setSession(session);
    }
  }
  // else: no-op (e.g., INITIAL_SESSION or unknown)

  return res;
}
