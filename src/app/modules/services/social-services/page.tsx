"use client";
import { useState } from "react";

export default function SocialServicesPublic() {
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;       // keep reference BEFORE await
    setMsg(null);
    setSubmitting(true);

    const fd = new FormData(form);
    const payload: any = Object.fromEntries(fd.entries());
    payload.terms_accepted = fd.get("terms_accepted") === "on";
    payload.fundraising_goal_dollars = fd.get("fundraising_goal_dollars")
      ? Number(fd.get("fundraising_goal_dollars") as string)
      : undefined;

    const res = await fetch("/api/social-services/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    setSubmitting(false);
    setMsg(json.ok ? "Thanks! Your request was submitted." : `Error: ${json.error || "Failed"}`);
    if (json.ok) form.reset();          // safe now
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold mb-2">Social Services Request</h1>
      <p className="text-gray-600 mb-6">Share your details and needs. Our team will review and contact you.</p>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="text-sm font-medium">Your Name *</label><input name="requester_name" required className="mt-1 w-full rounded-md border p-2" /></div>
          <div><label className="text-sm font-medium">Organization</label><input name="organization" className="mt-1 w-full rounded-md border p-2" /></div>
          <div><label className="text-sm font-medium">Email *</label><input name="email" type="email" required className="mt-1 w-full rounded-md border p-2" /></div>
          <div><label className="text-sm font-medium">Phone</label><input name="phone" className="mt-1 w-full rounded-md border p-2" /></div>
          <div><label className="text-sm font-medium">Best time to call</label><input name="best_time_to_call" className="mt-1 w-full rounded-md border p-2" /></div>
          <div><label className="text-sm font-medium">Requested date & time</label><input name="requested_datetime" type="datetime-local" className="mt-1 w-full rounded-md border p-2" /></div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div><label className="text-sm font-medium">Address line 1</label><input name="address_line1" className="mt-1 w-full rounded-md border p-2" /></div>
          <div><label className="text-sm font-medium">Address line 2</label><input name="address_line2" className="mt-1 w-full rounded-md border p-2" /></div>
          <div><label className="text-sm font-medium">City</label><input name="city" className="mt-1 w-full rounded-md border p-2" /></div>
          <div><label className="text-sm font-medium">State</label><input name="state" className="mt-1 w-full rounded-md border p-2" /></div>
          <div><label className="text-sm font-medium">ZIP</label><input name="zip" className="mt-1 w-full rounded-md border p-2" /></div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="text-sm font-medium">Website</label><input name="website" className="mt-1 w-full rounded-md border p-2" /></div>
          <div><label className="text-sm font-medium">Social links (comma separated)</label><input name="social_links" className="mt-1 w-full rounded-md border p-2" /></div>
        </div>

        <div>
          <label className="text-sm font-medium">Describe your need *</label>
          <textarea name="project_description" required rows={6} className="mt-1 w-full rounded-md border p-2" />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div><label className="text-sm font-medium">Fundraising goal (USD)</label><input name="fundraising_goal_dollars" type="number" step="0.01" className="mt-1 w-full rounded-md border p-2" /></div>
          <div><label className="text-sm font-medium">501(c)(3) EIN</label><input name="ein_501c3" className="mt-1 w-full rounded-md border p-2" /></div>
          <div><label className="text-sm font-medium">Assistance needed on site</label><input name="assistance_needed" placeholder="Projector, Donation boxes, Card readers…" className="mt-1 w-full rounded-md border p-2" /></div>
        </div>

        <label className="flex items-center gap-2">
          <input name="terms_accepted" type="checkbox" required />
          <span className="text-sm">I accept ICFC terms & conditions.</span>
        </label>

        <div><label className="text-sm font-medium">Name (for signature)</label><input name="signature_name" className="mt-1 w-full rounded-md border p-2" /></div>

        <button disabled={submitting} className="rounded-2xl bg-[#006400] text-white px-6 py-3 hover:opacity-90">
          {submitting ? "Submitting…" : "Submit Request"}
        </button>

        {msg && <p className="text-sm mt-2">{msg}</p>}
      </form>
    </main>
  );
}
