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

    // Send password reset email
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
    <div className="max-w-md mx-auto mt-20 mb-16 bg-white shadow-lg rounded-lg p-8 font-body">
      <h1 className="text-2xl font-title text-center text-primary mb-6">
        RESET YOUR PASSWORD
      </h1>

      {sent ? (
        <p className="text-green-600 text-center font-medium">
          ✅ Password reset email sent! Please check your inbox.
        </p>
      ) : (
        <form onSubmit={handleReset} className="space-y-5">
          <input
            type="email"
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full bg-primary hover:bg-[#004d00] text-white font-heading py-2 rounded transition"
          >
            Send Reset Link
          </button>
        </form>
      )}

      {error && (
        <p className="text-red-600 text-center mt-4">
          {error}
          <Link href="/signup" className="text-secondary underline ml-2">
            Sign up
          </Link>
        </p>
      )}
    </div>
  );
}
