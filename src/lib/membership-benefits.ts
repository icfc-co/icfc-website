// ICFC membership benefits shown on the user and member dashboards.
// Keep this list to what ICFC actually offers (confirmed by the board/office).

export type Benefit = { key: string; title: string; desc: string; featured?: boolean };

export const MEMBERSHIP_BENEFITS: Benefit[] = [
  {
    key: 'keyfob',
    title: 'Masjid entrance key fob',
    desc: 'Your own key fob to enter the masjid. Pick it up from the ICFC office once your membership is active.',
    featured: true,
  },
  {
    key: 'vote',
    title: 'Vote in ICFC elections',
    desc: 'Have your say in choosing the leadership of your masjid.',
  },
  {
    key: 'events',
    title: 'Members-only events',
    desc: 'Programs and gatherings open only to ICFC members.',
  },
  {
    key: 'announcements',
    title: 'Member announcements',
    desc: 'Important masjid news on your dashboard and straight to your inbox.',
  },
  {
    key: 'support',
    title: 'Community Support Network',
    desc: 'Ask for — or offer — rides, groceries, meals and a helping hand from fellow members.',
  },
];
