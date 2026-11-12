// Nikah (marriage) service requests: options shared by the public form,
// the submit API and the admin manager. Wording follows ICFC's original Google Form.

export const NIKAH_TZ = 'America/Denver';

type Opt<K extends string = string> = { value: K; label: string; flag?: boolean };

// Each requirement is marked available / not available (flag = needs follow-up)
export const REQUIREMENTS = [
  { key: 'consent', label: 'Consent of the bride and groom (both must agree willingly)' },
  { key: 'wali', label: 'Wali (guardian) of the bride must be present' },
  { key: 'witnesses', label: 'Two Muslim witnesses must attend and sign the contract' },
  { key: 'mahr', label: 'Mahr (dowry) agreed upon by both parties' },
  { key: 'license', label: 'Valid State marriage license (required by Colorado law)' },
  { key: 'kafaah', label: 'Kafā’ah (religious compatibility)' },
  { key: 'impediments', label: 'Freedom from impediments that impact the marriage' },
] as const;
export type RequirementKey = (typeof REQUIREMENTS)[number]['key'];

export const WITNESS_OPTS: Opt[] = [
  { value: 'confirmed', label: 'Yes, two witnesses have been confirmed.' },
  { value: 'will_arrange', label: 'Not yet, but we will arrange them.' },
  { value: 'need_help', label: 'We need assistance from the Imam/masjid to provide witnesses.', flag: true },
];

export const MAHR_OPTS: Opt[] = [
  { value: 'agreed', label: 'Yes, the Mahr has been agreed upon.' },
  { value: 'not_yet', label: 'No, the Mahr has not been agreed upon yet.', flag: true },
  { value: 'discussing', label: 'Still under discussion.', flag: true },
  { value: 'not_agreed', label: 'Not agreed.', flag: true },
];

export const WALI_OPTS: Opt[] = [
  { value: 'father', label: 'Father of the bride' },
  { value: 'relative', label: 'Another male guardian/relative (please specify)' },
  { value: 'imam', label: 'Imam / Islamic Judge (in case no Muslim guardian is available)', flag: true },
];

export const KAFAAH_OPTS: Opt[] = [
  { value: 'both_muslim', label: 'Yes, both the bride and groom are Muslims.' },
  { value: 'kitabiyya', label: 'Yes, the groom is Muslim and the bride is a practicing Jew or Christian.' },
  { value: 'not_met', label: 'No, the marriage does not fulfill the requirement.', flag: true },
];

export const IMPEDIMENT_OPTS: Opt[] = [
  { value: 'none', label: 'Yes, both are free from impediments.' },
  { value: 'some', label: 'No, there are impediments to the Nikah.', flag: true },
  { value: 'unclear', label: 'Still under discussion / needs clarification.', flag: true },
];

export const LICENSE_OPTS: Opt[] = [
  { value: 'have', label: 'Yes, we already have the license.' },
  { value: 'will_obtain', label: 'No, but we will obtain it before the Nikah.' },
  { value: 'need_info', label: 'Not yet, we need more information.', flag: true },
];

export const NIKAH_STATUSES = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800' },
  { value: 'in_review', label: 'In review', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'scheduled', label: 'Scheduled', color: 'bg-green-100 text-green-800' },
  { value: 'completed', label: 'Completed', color: 'bg-gray-200 text-gray-800' },
  { value: 'declined', label: 'Declined', color: 'bg-red-100 text-red-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-500' },
] as const;
export type NikahStatus = (typeof NIKAH_STATUSES)[number]['value'];
export const statusOf = (v: string) => NIKAH_STATUSES.find((s) => s.value === v) ?? NIKAH_STATUSES[0];

export const optLabel = (opts: Opt[], v: string | null | undefined) =>
  opts.find((o) => o.value === v)?.label ?? v ?? '—';

export type NikahRow = {
  id: string;
  created_at: string;
  updated_at: string;
  contact_email: string;
  groom_name: string;
  groom_phone: string;
  groom_email: string | null;
  groom_address: string | null;
  bride_name: string;
  bride_phone: string;
  bride_email: string | null;
  nikah_date: string; // YYYY-MM-DD
  nikah_time: string; // HH:MM[:SS]
  location: string;
  location_address: string | null;
  requirements: Record<RequirementKey, 'available' | 'not_available'>;
  requirements_notes: string | null;
  vows_acknowledged: boolean;
  witnesses: string;
  mahr: string;
  wali: string;
  wali_details: string | null;
  kafaah: string;
  impediments: string;
  license: string;
  declaration_groom: boolean;
  declaration_bride: boolean;
  resources_checked: boolean;
  resources_note: string | null;
  wants_to_donate: boolean;
  donation_amount: string | null;
  status: NikahStatus;
  scheduled_date: string | null;
  scheduled_time: string | null;
  officiant: string | null;
  staff_notes: string | null;
};

// Answers that need follow-up from the Imam/office
export function nikahFlags(r: NikahRow): string[] {
  const out: string[] = [];
  const missing = REQUIREMENTS.filter((q) => r.requirements?.[q.key] === 'not_available');
  if (missing.length) out.push(`Not available: ${missing.map((m) => m.key).join(', ')}`);
  if (!r.vows_acknowledged) out.push('Vows statement answered False');
  const pairs: [Opt[], string, string][] = [
    [WITNESS_OPTS, r.witnesses, 'Witnesses'],
    [MAHR_OPTS, r.mahr, 'Mahr'],
    [WALI_OPTS, r.wali, 'Wali'],
    [KAFAAH_OPTS, r.kafaah, 'Kafā’ah'],
    [IMPEDIMENT_OPTS, r.impediments, 'Impediments'],
    [LICENSE_OPTS, r.license, 'License'],
  ];
  for (const [opts, v, name] of pairs) {
    const o = opts.find((x) => x.value === v);
    if (o?.flag) out.push(`${name}: ${o.label}`);
  }
  if (r.location.trim().toUpperCase() !== 'ICFC') out.push('Off-site location (additional fees)');
  return out;
}

// "14:30[:00]" -> "2:30 PM"
export function fmtTime(t: string | null | undefined) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h)) return t;
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

// "2026-12-05" -> "Sat, Dec 5, 2026" (date-only, no timezone shift)
export function fmtDate(d: string | null | undefined) {
  if (!d) return '';
  const [y, mo, da] = d.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, da)).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

// Today's date in Fort Collins as YYYY-MM-DD
export const todayInFortCollins = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: NIKAH_TZ }).format(new Date());

export const COUNTY_LINKS = [
  ['Larimer County', 'https://www.larimer.gov/clerk/recording/marriage'],
  ['Boulder County', 'https://bouldercounty.gov/records/licenses/marriages-and-civil-unions/apply-for-marriage-license/'],
  ['Denver County', 'https://www.denvergov.org/Government/Agencies-Departments-Offices/Agencies-Departments-Offices-Directory/Denver-Clerk-and-Recorder/marriages-and-civil-unions'],
  ['Adams County', 'https://adcogov.org/marriage-or-civil-union-licenses'],
  ['Arapahoe County', 'https://files.arapahoeco.gov/your_county/county_departments/clerk_and_recorder/marriage___civil_union_licenses.php'],
  ['Jefferson County', 'https://www.jeffco.us/1023/Marriage-Licenses-Civil-Unions'],
  ['Douglas County', 'https://www.douglas.co.us/recording/marriage-licenses/'],
  ['El Paso County', 'https://clerkandrecorder.elpasoco.com/recording/marriage-licenses/'],
  ['Lake County (Clerk & Recorder)', 'https://www.lakecountyco.com/351/Clerk-Recorder'],
] as const;

export const RESOURCES: { group: string; links: [string, string][] }[] = [
  { group: 'Books & questionnaires', links: [
    ['“Before You Tie the Knot” — Salma Abugideiri & Imam Mohamed Magid', 'https://www.amazon.com/Before-You-Tie-Knot-Couples/dp/1493637053'],
    ['Premarital Questionnaire — Imam Mohamed Magid', 'https://docs.google.com/document/d/1JgiVSEjHws6VI4j0VwVGFSiEJ4-cMgdB/edit?usp=sharing'],
  ] },
  { group: 'The FYI — Family & Youth Institute', links: [
    ['5 Reasons for Conflict among American Muslim Couples', 'https://www.thefyi.org/infographics/pre-marriage-considerations-top-5-reasons-for-conflict-among-american-muslim-couples/'],
    ['The FYI’s Marriage Prep Toolkit', 'https://www.thefyi.org/toolkits/marriagepreptoolkit/'],
    ['The FYI’s Premarital Questionnaire', 'https://www.thefyi.org/the-fyis-premarital-questionnaire/'],
  ] },
  { group: 'Manners, etiquette & fiqh of marriage — SeekersGuidance', links: [
    ['Etiquette of Marriage', 'https://seekersguidance.org/articles/good-character/etiquette-marriage-comprehensive-seekersguidance-reader/'],
    ['Minimum steps to get married', 'https://seekersguidance.org/answers/hanafi-fiqh/minimum-steps-must-taken-marriage-valid/'],
    ['Love, Marriage and Relationships in Islam', 'https://seekersguidance.org/answers/general-counsel/marriage-in-islam-a-reader/'],
    ['Islamic Marriage', 'https://seekersguidance.org/tag/islamic-marriage/'],
  ] },
  { group: 'Interfaith marriage — Islamic perspectives', links: [
    ['Muslim Men and Women Marrying Non-Muslims? (SeekersGuidance)', 'https://seekersguidance.org/answers/general-counsel/what-is-islams-stance-on-muslim-men-and-women-marrying-non-muslims/'],
    ['Muslim men marrying Christian and Jewish women (Dar al-Ifta)', 'https://www.dar-alifta.org/Foreign/ViewFatwa.aspx?ID=8211'],
    ['Islam’s Stance on Muslim Men and Women Marrying Non-Muslims (AMJA)', 'https://www.amjaonline.org/?s=marriage+to+christian&post_type=all'],
  ] },
  { group: 'Preventing divorce', links: [
    ['Preventing divorce in the American Muslim community', 'https://www.academia.edu/12309670/Recommendations_for_promoting_healthy_marriages_and_preventing_divorce_in_the_American_Muslim_community'],
  ] },
];
