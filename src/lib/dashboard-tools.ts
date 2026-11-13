// Tools shown on the staff dashboards (super admin, admin, volunteer).
// Roles must match what src/middleware.ts lets each role open.

export type StaffRole = 'super_admin' | 'admin' | 'volunteer';

export type CountKey =
  | 'messages_new' | 'social_new' | 'support_open' | 'ramadan_pending' | 'nikah_new' | 'donations_verify';

export type Tool = {
  key: string;
  title: string;
  desc: string;
  group: 'requests' | 'community' | 'members' | 'site';
  roles: StaffRole[];
  href: (role: StaffRole) => string;
  count?: CountKey;
  countLabel?: string; // what the badge counts, e.g. "new"
};

const ALL: StaffRole[] = ['super_admin', 'admin', 'volunteer'];
const ADMINS: StaffRole[] = ['super_admin', 'admin'];

export const GROUPS: { key: Tool['group']; title: string }[] = [
  { key: 'requests', title: 'Requests & messages' },
  { key: 'community', title: 'Community & content' },
  { key: 'members', title: 'Members & finance' },
  { key: 'site', title: 'Site administration' },
];

export const TOOLS: Tool[] = [
  { key: 'messages', title: 'Messages', desc: 'Contact form and Ask the Imam messages', group: 'requests', roles: ALL,
    href: () => '/admin/messages', count: 'messages_new', countLabel: 'new' },
  { key: 'nikah', title: 'Nikah requests', desc: 'Marriage service requests and scheduling', group: 'requests', roles: ADMINS,
    href: () => '/admin/nikah', count: 'nikah_new', countLabel: 'new' },
  { key: 'social', title: 'Social services', desc: 'Requests for assistance and fundraising support', group: 'requests', roles: ALL,
    href: () => '/admin/social-services', count: 'social_new', countLabel: 'new' },
  { key: 'support', title: 'Community Support Network', desc: 'Member requests for rides, meals and help', group: 'requests', roles: ALL,
    href: () => '/admin/support-network', count: 'support_open', countLabel: 'open' },
  { key: 'ramadan', title: 'Ramadan volunteers', desc: 'Volunteer sign-ups and team assignments', group: 'requests', roles: ALL,
    href: (r) => (r === 'super_admin' ? '/super-admin/ramadan-volunteers' : r === 'admin' ? '/admin/ramadan-volunteers' : '/volunteer/ramadan-volunteers'),
    count: 'ramadan_pending', countLabel: 'pending' },

  { key: 'announcements', title: 'Announcements', desc: 'Post to the home page or email all members', group: 'community', roles: ADMINS,
    href: () => '/admin/announcements' },
  { key: 'events', title: 'Events', desc: 'Community calendar, posters and event donations', group: 'community', roles: ADMINS,
    href: () => '/admin/events' },
  { key: 'photos', title: 'Photo manager', desc: 'Gallery albums and photos', group: 'community', roles: ALL,
    href: () => '/photo-manager' },

  { key: 'members', title: 'Members directory', desc: 'Households, members and membership status', group: 'members', roles: ADMINS,
    href: () => '/admin/members' },
  { key: 'donations', title: 'Donations', desc: 'Online, Zelle and bank donations', group: 'members', roles: ADMINS,
    href: () => '/admin/donations', count: 'donations_verify', countLabel: 'to verify' },

  { key: 'roles', title: 'User roles', desc: 'Make someone an admin, volunteer, teacher…', group: 'site', roles: ['super_admin'],
    href: () => '/super-admin/roles' },
  { key: 'submenus', title: 'Navigation menus', desc: 'Show, hide and order website menu items', group: 'site', roles: ['super_admin'],
    href: () => '/super-admin/submenus' },
];

export const toolsFor = (role: StaffRole) => TOOLS.filter((t) => t.roles.includes(role));

// Counts a role may see (only for dashboards it can open)
export const countsFor = (role: StaffRole) =>
  [...new Set(toolsFor(role).map((t) => t.count).filter(Boolean))] as CountKey[];
