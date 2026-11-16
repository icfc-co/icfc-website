-- Recurring events: a series is a set of ordinary event rows created together
-- (one per date) that share series_id. Each row keeps the rule that created it
-- in repeat_rule so pages can say "Every Friday". Occurrences can be edited or
-- cancelled on their own, or together ("this and following" / "all").

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS series_id   uuid,
  ADD COLUMN IF NOT EXISTS repeat_rule jsonb;

CREATE INDEX IF NOT EXISTS events_series_idx ON public.events (series_id, starts_at) WHERE series_id IS NOT NULL;
