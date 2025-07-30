'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  // Check if email exists in profiles table
  const { data: userProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (fetchError || !userProfile) {
    setError('Email not found. Please sign up first.');
    return;
  }

  // Proceed with sending reset link
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${location.origin}/reset-password`,
  });

  if (error) {
    setError(error.message);
  } else {
    setSent(true);
  }
};


  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white shadow rounded">
      <h1 className="text-2xl font-bold mb-4 text-center">Reset Your Password</h1>

      {sent ? (
        <p className="text-green-600 text-center">
          Password reset email sent! Please check your inbox.
        </p>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          <input
            type="email"
            className="w-full px-3 py-2 border rounded"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full bg-cyan-700 hover:bg-cyan-800 text-white py-2 rounded"
          >
            Send Reset Link
          </button>
        </form>
      )}

      {error && (
        <p className="text-red-600 text-center mt-2">
          {error}
          <Link href="/signup" className="text-cyan-700 underline ml-1">
            Sign up
          </Link>
        </p>
      )}
    </div>
  );
}
