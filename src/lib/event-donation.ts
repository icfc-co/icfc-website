// Server-only: resolve the event a donation is for. Returns null when the gift is
// not for an event; throws a user-facing message when the event can't take gifts.
import { createClient } from '@supabase/supabase-js';

export type DonationEvent = { id: string; title: string };

export async function resolveDonationEvent(eventId: unknown): Promise<DonationEvent | null> {
  if (eventId == null || eventId === '') return null;
  if (typeof eventId !== 'string' || !/^[0-9a-f-]{36}$/i.test(eventId)) {
    throw new Error('Unknown event.');
  }
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data } = await service
    .from('events')
    .select('id, title, status, donations_enabled')
    .eq('id', eventId)
    .maybeSingle();
  if (!data || data.status !== 'published' || !data.donations_enabled) {
    throw new Error('This event is not accepting donations.');
  }
  return { id: data.id, title: data.title };
}
