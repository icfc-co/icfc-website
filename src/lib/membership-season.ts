// Members re-purchase each season; the Members Directory (and the admin dashboard
// figures) show this season's purchases plus anyone whose yearly subscription is
// still active. The season starts every September 1st: the most recent one on or
// before today.
export const SEASON_START_MONTH = 9; // September

export function currentSeasonStart(today = new Date()): string {
  const year = today.getMonth() + 1 >= SEASON_START_MONTH ? today.getFullYear() : today.getFullYear() - 1;
  return `${year}-${String(SEASON_START_MONTH).padStart(2, '0')}-01`;
}
