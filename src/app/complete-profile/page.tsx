"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import countryList from 'react-select-country-list';
import { supabase } from '@/lib/supabaseClient';

export default function CompleteProfile() {
  const router = useRouter();
  const [userId, setUserId] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
      else router.push('/login');
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !phone || !address || !country || !city || !age || !gender) {
      setErrorMsg('All fields are required.');
      return;
    }

    const { error } = await supabase.from('profiles').insert({
      id: userId,
      name,
      phone,
      address,
      country,
      city,
      age: parseInt(age),
      gender,
      email: (await supabase.auth.getUser()).data.user?.email,
    });

    if (error) {
      setErrorMsg('Failed to save profile. Please try again.');
    } else {
      router.push('/');
    }
  };

  return (
    <div className="max-w-md mx-auto my-20 p-6 bg-white rounded shadow font-body">
      <h1 className="text-2xl font-title text-primary text-center mb-6 uppercase">Complete Your Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Full Name"
          className="w-full px-4 py-2 border rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <PhoneInput
          country={'us'}
          value={phone}
          onChange={(value) => setPhone('+' + value)}
          inputProps={{
            required: true,
            name: 'phone',
            autoFocus: true,
          }}
          inputStyle={{
            width: '100%',
            paddingLeft: '48px',  
            height: '40px',
            borderRadius: '0.375rem',
            border: '1px solid #d1d5db',
            fontSize: '1rem',
          }}
          containerStyle={{ width: '100%' }}
          buttonStyle={{ borderRight: '1px solid #d1d5db' }}
        />


        <input
          type="text"
          placeholder="Street Address"
          className="w-full px-4 py-2 border rounded"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="City"
          className="w-full px-4 py-2 border rounded"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required
        />

        <select
          className="w-full px-4 py-2 border rounded"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          required
        >
          <option value="" disabled>Select Country</option>
          {countryList().getData().map((c) => (
            <option key={c.value} value={c.label}>{c.label}</option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Age"
          className="w-full px-4 py-2 border rounded"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          required
        />

        <select
          className="w-full px-4 py-2 border rounded"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          required
        >
          <option value="" disabled>Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
          <option value="Prefer not to say">Prefer not to say</option>
        </select>

        {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}

        <button
          type="submit"
          className="w-full bg-primary hover:bg-green-800 text-white font-semibold py-2 rounded"
        >
          Save & Continue
        </button>
      </form>
    </div>
  );
}
