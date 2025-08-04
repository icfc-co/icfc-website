'use client';

import { useState } from 'react';

export default function DonatePage() {
  const [amount, setAmount] = useState(50);
  const [donationType, setDonationType] = useState('Zakat');
  const [isRecurring, setIsRecurring] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDonate = async () => {
    setLoading(true);
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, donationType, isRecurring }),
    });

    const data = await res.json();
    if (data?.url) window.location.href = data.url;
    else alert('Something went wrong');
    setLoading(false);
  };

  return (
    <section className="pt-28 pb-24 px-4 bg-white text-gray-900 font-roboto">
      <div className="max-w-xl mx-auto">
        <h1 className="text-4xl font-montserrat font-bold text-center mb-10">
          Support ICFC
        </h1>

        <div className="mb-6">
          <label className="block mb-2 font-medium">Donation Amount ($)</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            className="border border-gray-300 rounded px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-green-700"
            min={1}
          />
        </div>

        <div className="mb-6">
          <label className="block mb-2 font-medium">Donation Type</label>
          <select
            value={donationType}
            onChange={e => setDonationType(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-green-700"
          >
            <option value="Zakat">Zakat</option>
            <option value="Sadaqah">Sadaqah</option>
            <option value="General">General</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={e => setIsRecurring(e.target.checked)}
              className="mr-2"
            />
            Make this a recurring monthly donation
          </label>
        </div>

        <button
          onClick={handleDonate}
          disabled={loading}
          className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 w-full rounded text-lg transition disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Donate Now'}
        </button>
      </div>
    </section>
  );
}
