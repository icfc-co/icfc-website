// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  // Only guard /admin
  if (!req.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // We need a mutable response so cookies can be written if session refresh happens
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // New API: get/set/remove (getAll/setAll are deprecated)
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Parameters<typeof res.cookies.set>[2]) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: Parameters<typeof res.cookies.set>[1]) {
          res.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};

export const config = {
  matcher: ["/((?!api/stripe/webhook).*)"],
};
