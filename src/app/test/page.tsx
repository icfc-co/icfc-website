'use client';

import { useEffect } from 'react';

export default function TestPage() {
  useEffect(() => {
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }, []);

  return <div className="p-4">Check your browser console 🔍</div>;
}
