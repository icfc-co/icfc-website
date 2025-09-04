import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const h = headers();
  try {
    const body = await req.json();

    // minimal server-side validation
    const required = ["requester_name","email","project_description","terms_accepted"] as const;
    for (const k of required) {
      if (!body?.[k]) return NextResponse.json({ error: `Missing ${k}` }, { status: 400 });
    }

    const fundraising_goal_cents =
      typeof body.fundraising_goal_dollars === "number"
        ? Math.round(body.fundraising_goal_dollars * 100)
        : null;

    const insertRow = {
      requester_name: body.requester_name,
      organization: body.organization ?? null,
      email: body.email,
      phone: body.phone ?? null,
      best_time_to_call: body.best_time_to_call ?? null,

      address_line1: body.address_line1 ?? null,
      address_line2: body.address_line2 ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      zip: body.zip ?? null,

      website: body.website ?? null,
      social_links: body.social_links ?? null,

      requested_datetime: body.requested_datetime ?? null,
      project_description: body.project_description,
      fundraising_goal_cents,
      ein_501c3: body.ein_501c3 ?? null,
      assistance_needed: body.assistance_needed ?? null,
      terms_accepted: !!body.terms_accepted,
      signature_name: body.signature_name ?? null,

      submitter_ip: h.get("x-forwarded-for")?.split(",")[0] ?? null,
      user_agent: h.get("user-agent") ?? null,
    };

    const { data, error } = await supabaseAdmin
      .from("social_service_requests")
      .insert(insertRow)
      .select("id")
      .single();

    if (error) {
      return NextResponse.json(
        { error: `${error.message} :: ${error.details ?? ""} ${error.hint ?? ""}`.trim() },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Submission failed" }, { status: 500 });
  }
}
