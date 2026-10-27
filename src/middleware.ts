// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const STAFF = ["super_admin", "admin", "volunteer"];
const ADMINS = ["super_admin", "admin"];

// First matching prefix wins. null = any signed-in user.
// Volunteers reach messages and social services from the volunteer dashboard.
const RULES: [prefix: string, roles: string[] | null][] = [
  ["/super-admin", ["super_admin"]],
  ["/admin/messages", STAFF],
  ["/admin/social-services", STAFF],
  ["/admin", ADMINS],
  ["/volunteer", STAFF],
  ["/photo-manager", STAFF],
  ["/debug", ["super_admin"]],
  ["/test", ["super_admin"]],
  ["/api/debug", ["super_admin"]],
  ["/teacher", null],
  ["/student", null],
  ["/member", null],
  ["/user", null],
  ["/my-profile", null],
  ["/complete-profile", null],
];

const matches = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + "/");

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const rule = RULES.find(([prefix]) => matches(path, prefix));
  if (!rule) return NextResponse.next();
  const allowed = rule[1];
  const isApi = path.startsWith("/api/");

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
    if (isApi) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", path + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (allowed) {
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", user.id);
    const names = (roleRows ?? []).map((r: any) => r?.roles?.name).filter(Boolean) as string[];

    if (!names.some((n) => allowed.includes(n))) {
      if (isApi) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const url = req.nextUrl.clone();
      url.pathname = "/403";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/super-admin/:path*",
    "/admin/:path*",
    "/volunteer/:path*",
    "/photo-manager/:path*",
    "/debug/:path*",
    "/test/:path*",
    "/api/debug/:path*",
    "/teacher/:path*",
    "/student/:path*",
    "/member/:path*",
    "/user/:path*",
    "/my-profile/:path*",
    "/complete-profile/:path*",
  ],
};
