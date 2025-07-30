'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setConfirmed(true);
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      alert(error.message);
    } else {
      alert('Password updated. You can now login.');
      router.push('/login');
    }
  };

  if (!confirmed) {
    return (
      <div className="text-center mt-16">
        <p>Verifying token...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white shadow rounded">
      <h1 className="text-2xl font-bold mb-4 text-center">Set a New Password</h1>
      <form onSubmit={handleUpdatePassword} className="space-y-4">
        <input
          type="password"
          className="w-full px-3 py-2 border rounded"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          className="w-full bg-cyan-700 hover:bg-cyan-800 text-white py-2 rounded"
        >
          Update Password
        </button>
      </form>
    </div>
  );
}
