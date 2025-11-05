// app/elections/2026/membership-review/page.tsx
import { createClient } from "@supabase/supabase-js";
import MembersTable from "./table"; // client component

type AnyRow = Record<string, any>;
type Row = {
  name: string;
  gender: string;
  eligible: "Yes" | "No";
  reason: string;
};

function coalesce<T>(...vals: (T | undefined | null | "" | number)[]) {
  for (const v of vals) {
    if (v !== undefined && v !== null && v !== "" && v !== Number.NaN) return v as T;
  }
  return undefined as unknown as T;
}

function buildName(r: AnyRow): string {
  const firstLast = [r.first_name, r.last_name].filter(Boolean).join(" ");
  return (r.full_name as string) || (r.name as string) || firstLast || "—";
}

function buildGender(r: AnyRow): string {
  return (r.gender as string) || (r.sex as string) || "—";
}

/** NEW: derive membership "type" from common columns and decide eligibility */
function getMembershipType(r: AnyRow): string {
  // Try common column names you might have in membership_members
  const raw = coalesce<string>(
    r.plan_type,
    r.membership_type,
    r.type,
    r.category,
    r.tier
  );
  return (raw || "").toString().trim();
}

function deriveEligibilityByType(r: AnyRow): { eligible: "Yes" | "No"; reason: string } {
  const type = getMembershipType(r).toLowerCase();
  if (type.includes("youth")) {
    return { eligible: "No", reason: "Youth membership" };
  }
  // You can add more non-voting categories here if needed:
  // if (type.includes("associate")) return { eligible: "No", reason: "Associate membership (non-voting)" };

  return { eligible: "Yes", reason: "" };
}

async function fetchRows(): Promise<{ rows: Row[]; error: string | null }> {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from("membership_members")
    .select("*")
    .order("id", { ascending: true });

  if (error) return { rows: [], error: error.message };

  const rows: Row[] = (data as AnyRow[]).map((r) => {
    const { eligible, reason } = deriveEligibilityByType(r);
    return {
      name: buildName(r),
      gender: buildGender(r),
      eligible,
      reason,
    };
  });

  // Eligible first; ineligible (youth) last
  rows.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible === "Yes" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return { rows, error: null };
}

export const revalidate = 0;

export default async function Page() {
  const { rows, error } = await fetchRows();
  const regClosedOn = "November 4, 2025";
  const reviewWindow = "November 5 – November 6, 2025";
  const nominationFormUrl = "https://docs.google.com/forms/d/e/1FAIpQLScb-TQUTcNMiPce1bMXqcuSCURfR9lL-B_egTqR1gvnB5xFGg/viewform?usp=dialog"; // your link

  return (
    <div className="min-h-screen bg-[#0a4b1a] text-white px-6 py-10 flex flex-col items-center">
      <h1 className="text-4xl font-extrabold text-[#FFD700] mb-3 text-center">
        Membership Registration Closed
      </h1>

      <p className="text-lg mb-6 text-center max-w-3xl">
        Membership registration ended on <b>{regClosedOn}</b>. The <b>review process</b> has now started.
      </p>

      <div className="bg-[#14532d] w-full max-w-3xl p-6 rounded-2xl shadow-lg text-center mb-8">
        <h2 className="text-2xl font-semibold text-[#FFE27A] mb-2">Nomination Form</h2>
        <p className="mb-4">
          File nominations for <b>President</b> and <b>3 Board Members</b>. Only registered members may submit.
        </p>
        <a
          href={nominationFormUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-[#FFD700] text-[#0a4b1a] px-6 py-3 rounded-xl font-bold hover:opacity-90"
        >
          Open Nomination Form
        </a>
      </div>

      <div className="bg-[#14532d] w-full max-w-6xl p-6 rounded-2xl shadow-lg overflow-x-auto">
        <h2 className="text-2xl font-semibold text-[#FFE27A] mb-2 text-center">
          Membership List to Review - Review Window: {reviewWindow}
        </h2>

        {error ? (
          <div className="bg-red-600/20 border border-red-500 rounded-xl p-4 text-red-200 mb-4">
            Couldn’t load the members list. Error: {error}
          </div>
        ) : (
          <MembersTable rows={rows} />
        )}
      </div>
    </div>
  );
}
