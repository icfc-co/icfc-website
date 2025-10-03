import { supabase } from '@/lib/supabaseClient';

export async function refreshRole() {
  try {
    await supabase.rpc('refresh_my_role'); // calls SECURITY DEFINER fn in DB
  } catch {
    // ignore — it's a best-effort refresh
  }
}
