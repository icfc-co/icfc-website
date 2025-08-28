// src/lib/is-admin-server.ts
import { supabaseServer } from './supabase-server';

export async function isAdminServer(): Promise<boolean> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return !!data;
}