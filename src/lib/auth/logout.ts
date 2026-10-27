'use client';

import { supabase } from '@/lib/supabaseClient';

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Logout error:', error.message);
    alert('Logout failed. Please try again.');
  } else {
    // Clear the server session cookie too, so the next account doesn't inherit it
    await fetch('/api/auth/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'SIGNED_OUT' }),
    }).catch(() => {});
    window.location.href = '/login'; // or '/'
  }
}
