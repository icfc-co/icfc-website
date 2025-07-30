'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function CompleteProfile() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [userId, setUserId] = useState('');
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
      else router.push('/login');
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from('profiles').insert({
      id: userId,
      name,
      phone,
      address,
      age: parseInt(age),
      gender,
      email: (await supabase.auth.getUser()).data.user?.email,
    });

    if (error) {
      alert('Error saving profile: ' + error.message);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white shadow rounded">
      <h1 className="text-2xl font-bold mb-4 text-center">Complete Your Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" placeholder="Full Name" className="w-full px-3 py-2 border rounded" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="text" placeholder="Phone" className="w-full px-3 py-2 border rounded" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input type="text" placeholder="Address" className="w-full px-3 py-2 border rounded" value={address} onChange={(e) => setAddress(e.target.value)} />
        <input type="number" placeholder="Age" className="w-full px-3 py-2 border rounded" value={age} onChange={(e) => setAge(e.target.value)} />
        <select className="w-full px-3 py-2 border rounded" value={gender} onChange={(e) => setGender(e.target.value)} required>
          <option value="" disabled>Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
          <option value="Prefer not to say">Prefer not to say</option>
        </select>
        <button type="submit" className="w-full bg-cyan-700 hover:bg-cyan-800 text-white py-2 rounded">Submit</button>
      </form>
    </div>
  );
}
