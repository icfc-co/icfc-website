// Alert types and who receives them. Shared by the server sender and the
// My Profile "Email alerts" settings, so it must stay free of server imports.
// Roles mirror who can open each dashboard in src/middleware.ts.

const STAFF = ['super_admin', 'admin', 'volunteer'];
const ADMINS = ['super_admin', 'admin'];

export const ALERTS = {
  contact: {
    label: 'Contact & Ask the Imam messages',
    roles: STAFF,
    path: () => '/admin/messages',
  },
  social_services: {
    label: 'Social services requests',
    roles: STAFF,
    path: () => '/admin/social-services',
  },
  support_network: {
    label: 'Community Support Network requests',
    roles: STAFF,
    path: () => '/admin/support-network',
  },
  ramadan_volunteers: {
    label: 'Ramadan volunteer sign-ups',
    roles: STAFF,
    path: (role: string) => (role === 'volunteer' ? '/volunteer/ramadan-volunteers' : '/admin/ramadan-volunteers'),
  },
  nikah: {
    label: 'Nikah requests',
    roles: ADMINS,
    path: () => '/admin/nikah',
  },
  donations_to_verify: {
    label: 'Zelle / bank donations to verify',
    roles: ADMINS,
    path: () => '/admin/donations',
  },
} satisfies Record<string, { label: string; roles: string[]; path: (role: string) => string }>;

export type AlertKey = keyof typeof ALERTS;
export const ALERT_KEYS = Object.keys(ALERTS) as AlertKey[];

export const alertsForRole = (role: string | null | undefined) =>
  ALERT_KEYS.filter((k) => !!role && ALERTS[k].roles.includes(role));
