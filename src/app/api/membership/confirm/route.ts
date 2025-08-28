// src/app/api/membership/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function dateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set() {}, remove() {}
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  // promote to member + write membership if missing
  try {
    // get role id for 'member'
    const { data: roleRow, error: roleErr } = await supabase
      .from("roles")
      .select("id")
      .eq("name", "member")
      .maybeSingle();

    if (roleErr) console.error("[confirm] roles fetch error:", roleErr);

    if (roleRow?.id) {
      // delete existing roles for the user, then insert member
      await supabase.from("user_roles").delete().eq("user_id", user.id);
      const { error: insErr } = await supabase.from("user_roles").insert({
        user_id: user.id,
        role_id: roleRow.id,
      });
      if (insErr) console.error("[confirm] user_roles insert error:", insErr);
    }

    // ensure a membership row exists and is active
    const now = new Date();
    const end = new Date(now);
    end.setFullYear(end.getFullYear() + 1);

    const { error: memberErr } = await supabase
      .from("memberships")
      .upsert(
        {
          user_id: user.id,
          plan_type: "Annual",
          status: "active",
          start_date: dateOnly(now),
          end_date: dateOnly(end),
        },
        { onConflict: "user_id" }
      );

    if (memberErr) {
      console.error("[confirm] memberships upsert error:", memberErr);
      return NextResponse.json({ ok: false, error: "membership_upsert_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[confirm] error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
