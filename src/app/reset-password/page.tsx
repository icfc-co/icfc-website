'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const search = useSearchParams();
  const router = useRouter();

  const [stage, setStage] = useState<'verifying'|'set'|'done'|'error'>('verifying');
  const [msg, setMsg] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      // If Supabase appended an error param (e.g., otp_expired)
      const urlErr = search.get('error');
      if (urlErr) {
        setMsg(decodeURIComponent(urlErr));
        setStage('error');
        return;
      }

      try {
        // New flow: `?code=...`
        const code = search.get('code');
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        } else {
          // Fallback: hash-based recovery or implicit exchange
          await supabase.auth.exchangeCodeForSession();
        }
        setStage('set');
      } catch (e: any) {
        setMsg(e?.message || 'Email link is invalid or has expired.');
        setStage('error');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');

    if (newPassword.length < 12) {
      setMsg('Password must be at least 12 characters long.');
      setStage('set');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg('Passwords do not match.');
      setStage('set');
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);

    if (error) {
      setMsg(error.message);
      setStage('error');
    } else {
      setStage('done');
      setTimeout(() => router.replace('/login'), 1800);
    }
  };

  if (stage === 'verifying') {
    return <div className="text-center mt-20 text-lg font-medium">Verifying token...</div>;
  }

  if (stage === 'error') {
    return <div className="max-w-md mx-auto mt-20 mb-16 p-8 bg-white shadow rounded text-center text-red-600">
      Error: {msg}
    </div>;
  }

  if (stage === 'done') {
    return <div className="max-w-md mx-auto mt-20 mb-16 p-8 bg-white shadow rounded text-center text-green-700">
      ✅ Password changed successfully! Redirecting to login...
    </div>;
  }

  // stage === 'set'
  return (
    <div className="max-w-md mx-auto mt-20 mb-16 p-8 bg-white shadow-md rounded">
      <h1 className="text-2xl font-bold mb-6 text-center text-green-800">Set a New Password</h1>

      <form onSubmit={handleUpdatePassword} className="space-y-4">
        <input
          type="password"
          className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-700"
          placeholder="New Password (min 12 chars)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={12}
          required
        />
        <input
          type="password"
          className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-700"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        {msg && <p className="text-red-600 text-sm">{msg}</p>}
        <button
          type="submit"
          className="w-full bg-green-800 hover:bg-green-900 text-white py-2 rounded transition disabled:opacity-60"
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
