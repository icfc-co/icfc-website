'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  age: number;
  gender: string;
  city: string;
  country: string;
};

export default function ViewProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<{ [key: string]: any }>({});
  const [role, setRole] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) console.error(error.message);
      else {
        setProfile(data);
        setFieldValues(data);
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', user.id)
        .single();

      const { data: roleNameData } = await supabase
        .from('roles')
        .select('name')
        .eq('id', roleData?.role_id)
        .single();

      setRole(roleNameData?.name || '');
    };

    fetchProfile();
  }, []);

  const handleEdit = (field: string) => setEditingField(field);

  const handleSave = async (field: string) => {
    if (!profile) return;
    const newValue = fieldValues[field];

    const { error } = await supabase
      .from('profiles')
      .update({ [field]: newValue })
      .eq('id', profile.id);

    if (error) alert('Update failed: ' + error.message);
    else {
      setProfile((prev) => prev && { ...prev, [field]: newValue });
      setEditingField(null);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFieldValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  if (!profile) return <p className="text-center mt-10">Loading profile...</p>;

  const profileFields: { key: keyof Profile; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'country', label: 'Country' },
    { key: 'age', label: 'Age' },
    { key: 'gender', label: 'Gender' },
  ];

  return (
    <div className="max-w-4xl mx-auto mt-12 p-6 bg-white shadow-xl rounded-lg font-body">
      <h2 className="text-3xl font-title text-primary text-center mb-8">My Profile</h2>

      <div className="grid sm:grid-cols-2 gap-6 mb-6">
        {profileFields.map(({ key, label }) => (
          <div
            key={key}
            className="flex flex-col bg-gray-50 p-4 rounded-md border shadow-sm"
          >
            <span className="text-sm text-secondary font-semibold">{label}</span>
            {editingField === key ? (
              key === 'gender' ? (
                <select
                  className="mt-1 border px-2 py-1 rounded"
                  value={fieldValues[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              ) : (
                <input
                  type={key === 'age' ? 'number' : 'text'}
                  value={fieldValues[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="mt-1 border px-2 py-1 rounded"
                />
              )
            ) : (
              <span className="mt-1 text-base">{profile[key]}</span>
            )}
            <div className="mt-2 text-right">
              {editingField === key ? (
                <button
                  className="text-green-700 text-sm font-medium hover:underline"
                  onClick={() => handleSave(key)}
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
        ))}
      </div>

      <div className="text-right text-sm text-secondary mb-4">
        <strong>Role:</strong> <span className="text-primary ml-1 font-semibold">{role}</span>
      </div>

      <div className="flex flex-col space-y-3">
        <button
          className="bg-primary text-white px-4 py-2 rounded hover:bg-green-800"
          onClick={() => router.push('/registration/membership')}
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
