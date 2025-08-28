import { supabaseBrowser } from './supabase-browser';

export async function isAdminClient(): Promise<boolean> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return !!data;
}