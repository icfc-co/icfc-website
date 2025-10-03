'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { refreshRole } from '@/lib/refreshRole';


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState('');
  const router = useRouter();



  const handleLogin = async () => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setWarning(error.message);
    return;
  }

  const user = data.user;

  // 🔹 IMPORTANT: sync role from membership BEFORE you read/insert roles
  await refreshRole();

  // Insert into users table if missing
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!existingUser) {
    await supabase.from('users').insert({ id: user.id, email: user.email });
  }

  // Only assign 'user' if no role exists (do NOT overwrite 'member'/'admin')
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role_id')
    .eq('user_id', user.id)
    .maybeSingle(); // safer than .single()

  if (!userRole) {
    const { data: role } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'user')
      .single();

    if (role) {
      await supabase.from('user_roles').insert({
        user_id: user.id,
        role_id: role.id,
      });
    }
  }

  // Check for profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    router.push('/complete-profile');
    return;
  }

  // Redirect to role-based dashboard
  router.push('/redirect');
};

  const handleSignup = async () => {
    if (password.length < 12) {
      setWarning('Password must be at least 12 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setWarning('Passwords do not match.');
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/complete-profile`,
      },
    });

    if (error) {
      setWarning(error.message);
    } else {
      setWarning('');
      alert('Signup successful! Please verify your email before logging in.');
      setIsLogin(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWarning('');
    setLoading(true);

    if (isLogin) {
      await handleLogin();
    } else {
      await handleSignup();
    }

    setLoading(false);
  };

  

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded shadow-md font-body">
      <h1 className="text-2xl font-heading text-primary text-center mb-6">
        {isLogin ? 'Login to ICFC' : 'Create an Account'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          className="w-full px-3 py-2 border rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          className="w-full px-3 py-2 border rounded"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {!isLogin && (
          <input
            type="password"
            className="w-full px-3 py-2 border rounded"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        )}

        {warning && (
          <div className="text-red-600 text-sm font-medium">{warning}</div>
        )}

        <button
          type="submit"
          className="w-full bg-primary hover:bg-green-800 text-white font-bold py-2 rounded transition"
          disabled={loading}
        >
          {loading ? 'Please wait...' : isLogin ? 'Login' : 'Sign Up'}
        </button>
      </form>

      {isLogin && (
        <div className="text-sm text-center mt-2">
          <Link href="/forgot-password" className="text-primary underline">
            Forgot Password?
          </Link>
        </div>
      )}

      <div className="mt-4 text-sm text-center">
        {isLogin ? (
          <>
            Don’t have an account?{' '}
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className="text-secondary underline"
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className="text-primary underline"
            >
              Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
