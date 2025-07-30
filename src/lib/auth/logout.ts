'use client';

import { supabase } from '@/lib/supabaseClient';

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Logout error:', error.message);
    alert('Logout failed. Please try again.');
  } else {
    window.location.href = '/login'; // or '/'
  }
}
