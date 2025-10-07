'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import countryList from 'react-select-country-list';

type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  age: number | null;
  gender: string;
  city: string;
  country: string;
};

const REQUIRED_FIELDS: (keyof Profile)[] = [
  'name', 'email', 'phone', 'address', 'city', 'country', 'age', 'gender',
];

export default function ViewProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editingField, setEditingField] = useState<keyof Profile | null>(null);
  const [fieldValues, setFieldValues] = useState<Partial<Profile>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [role, setRole] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const countries = useMemo(() => countryList().getData(), []);

  const labelOf = (field: keyof Profile) =>
    ({
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      city: 'City',
      country: 'Country',
      age: 'Age',
      gender: 'Gender',
      id: 'ID',
    }[field] || String(field));

  const validateField = (field: keyof Profile, value: any): string => {
    const v = typeof value === 'string' ? value.trim() : value;

    if (REQUIRED_FIELDS.includes(field)) {
      if (v === '' || v === null || v === undefined) return `${labelOf(field)} is required.`;
    }

    if (field === 'email') {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v));
      if (!ok) return 'Enter a valid email address.';
    }

    if (field === 'phone') {
      const digits = String(v).replace(/\D/g, '');
      if (digits.length < 10) return 'Enter a valid phone number (10+ digits).';
    }

    if (field === 'age') {
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) return 'Age must be a positive number.';
      if (n > 120) return 'Please enter a realistic age.';
    }

    if (field === 'gender') {
      if (!['Male', 'Female', 'Other'].includes(String(v))) return 'Select a valid gender.';
    }

    return '';
  };

  const validateAll = (vals: Partial<Profile>) => {
    const e: Record<string, string> = {};
    for (const f of REQUIRED_FIELDS) e[f] = validateField(f, (vals as any)[f]);
    return e;
  };

  const isComplete = profile ? Object.values(validateAll(profile)).every((msg) => !msg) : false;

  const missingList = useMemo(() => {
    if (!profile) return [];
    const e = validateAll(profile);
    return Object.entries(e)
      .filter(([, msg]) => !!msg)
      .map(([k]) => labelOf(k as keyof Profile));
  }, [profile]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle(); // 👈 avoid throw if no row

        if (profErr) {
          console.error('profiles error:', profErr.message);
        }

        if (prof) {
          setProfile(prof as Profile);
          setFieldValues(prof as Profile);
          setErrors(validateAll(prof as Profile));
        } else {
          // if there is truly no profile row, set an empty shell so UI can show requireds
          const empty: Profile = {
            id: user.id,
            name: '',
            email: user.email ?? '',
            phone: '',
            address: '',
            age: null,
            gender: '',
            city: '',
            country: '',
          };
          setProfile(empty);
          setFieldValues(empty);
          setErrors(validateAll(empty));
        }

        // Role lookup — all optional/guarded
        const { data: roleLink, error: roleLinkErr } = await supabase
          .from('user_roles')
          .select('role_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (roleLinkErr) {
          console.warn('user_roles error:', roleLinkErr.message);
        }

        let roleName = '';
        if (roleLink?.role_id) {
          const { data: roleRow, error: roleErr } = await supabase
            .from('roles')
            .select('name')
            .eq('id', roleLink.role_id)
            .maybeSingle();

          if (roleErr) console.warn('roles error:', roleErr.message);
          roleName = roleRow?.name ?? '';
        }
        setRole(roleName);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const handleEdit = (field: keyof Profile) => {
    setEditingField(field);
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleChange = (field: keyof Profile, value: any) => {
    const sanitized =
      typeof value === 'string' && field !== 'email'
        ? value.replace(/\s+/g, ' ').trimStart()
        : value;

    setFieldValues((prev) => ({ ...prev, [field]: sanitized as any }));
    setErrors((prev) => ({ ...prev, [field]: validateField(field, sanitized) }));
  };

  const handleSave = async (field: keyof Profile) => {
    if (!profile) return;
    const newValue = (fieldValues as any)[field];

    const err = validateField(field, newValue);
    if (err) {
      setErrors((prev) => ({ ...prev, [field]: err }));
      return;
    }

    const payload =
      field === 'age'
        ? { [field]: Number(newValue) }
        : { [field]: newValue };

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', profile.id);

    if (error) {
      alert('Update failed: ' + error.message);
    } else {
      const updated = { ...profile, ...payload } as Profile;
      setProfile(updated);
      setFieldValues(updated);
      setErrors((prev) => ({ ...prev, [field]: '' }));
      setEditingField(null);
    }
  };

  const handleToggleNotifications = () => setShowNotifications((s) => !s);

  if (loading) return <p className="text-center mt-10">Loading profile...</p>;
  if (!profile) return <p className="text-center mt-10">No profile found.</p>;

  const profileFields: { key: keyof Profile; label: string; type?: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'country', label: 'Country' },
    { key: 'age', label: 'Age', type: 'number' },
    { key: 'gender', label: 'Gender' },
  ];

  return (
    <div className="max-w-4xl mx-auto mt-12 p-6 bg-white shadow-xl rounded-lg font-body">
      <h2 className="text-3xl font-title text-primary text-center mb-6">My Profile</h2>

      {!isComplete && (
        <div className="mb-6 rounded-md border border-yellow-300 bg-yellow-50 p-4 text-yellow-900">
          <div className="font-semibold mb-1">Please complete your profile</div>
          <div className="text-sm">Missing/invalid: {missingList.join(', ')}</div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-6 mb-6">
        {profileFields.map(({ key, label, type }) => {
          const isEditing = editingField === key;
          const val = (fieldValues as any)[key] ?? '';
          const err = errors[key as string];

          return (
            <div key={key} className="flex flex-col bg-gray-50 p-4 rounded-md border shadow-sm">
              <span className="text-sm text-secondary font-semibold">
                {label} <span className="text-red-600">*</span>
              </span>

              {isEditing ? (
                key === 'gender' ? (
                  <select
                    className="mt-1 border px-2 py-2 rounded outline-none"
                    value={String(val || '')}
                    onChange={(e) => handleChange(key, e.target.value)}
                  >
                    <option value="" disabled>Select gender…</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                ) : key === 'country' ? (
                  <select
                    className="mt-1 border px-2 py-2 rounded outline-none"
                    value={String(val || '')}
                    onChange={(e) => handleChange(key, e.target.value)}
                  >
                    <option value="" disabled>Select country…</option>
                    {countries.map((c) => (
                      <option key={c.value} value={c.label}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    required
                    type={type || 'text'}
                    value={String(val ?? '')}
                    onChange={(e) =>
                      handleChange(
                        key,
                        type === 'number' ? Number(e.target.value) : e.target.value
                      )
                    }
                    className="mt-1 border px-3 py-2 rounded outline-none"
                    inputMode={key === 'phone' ? 'tel' : undefined}
                    min={key === 'age' ? 1 : undefined}
                  />
                )
              ) : (
                <span className="mt-1 text-base">{String((profile as any)[key] ?? '')}</span>
              )}

              {err && <span className="mt-1 text-xs text-red-600">{err}</span>}

              <div className="mt-2 text-right">
                {isEditing ? (
                  <button
                    className="text-green-700 text-sm font-medium hover:underline disabled:opacity-50"
                    onClick={() => handleSave(key)}
                    disabled={!!err || (val === '' || val === null || val === undefined)}
                  >
                    Save
                  </button>
                ) : (
                  <button
                    className="text-blue-700 text-sm font-medium hover:underline"
                    onClick={() => handleEdit(key)}
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-right text-sm text-secondary mb-4">
        <strong>Role:</strong>
        <span className="text-primary ml-1 font-semibold">{role || '—'}</span>
      </div>

      <div className="flex flex-col space-y-3">
        <button
          className="bg-primary text-white px-4 py-2 rounded hover:bg-green-800 disabled:opacity-50"
          onClick={() => router.push('/registration/membership/manage')}
          disabled={!isComplete}
          title={!isComplete ? 'Complete your profile to continue' : undefined}
        >
          Manage Membership
        </button>

        <button
          className="text-sm text-blue-700 hover:underline"
          onClick={handleToggleNotifications}
        >
          {showNotifications ? 'Hide Notification Settings' : 'Show Notification Settings'}
        </button>

        {showNotifications && (
          <div className="mt-2 border rounded p-4 space-y-2 bg-gray-50">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" /> Message Notifications
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" /> Emails
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" /> Newsletters
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" /> Event Updates
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
