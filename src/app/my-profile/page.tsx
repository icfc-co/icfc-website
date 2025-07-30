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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error(error.message);
      } else {
        setProfile(data);
        setFieldValues(data);
      }

      // Fetch role
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

  const handleEdit = (field: string) => {
    setEditingField(field);
  };

  const handleSave = async (field: string) => {
  if (!profile) return;

  const newValue = fieldValues[field];

  console.log('Saving field:', field, 'with value:', newValue);

  const { error } = await supabase
    .from('profiles')
    .update({ [field]: newValue })
    .eq('id', profile.id);

  if (error) {
    alert('Update failed: ' + error.message);
  } else {
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

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white shadow-md rounded">
      <h2 className="text-2xl font-bold text-center mb-6">My Profile</h2>
      <div className="space-y-4">
        {['name', 'email', 'phone', 'address', 'age', 'gender'].map((field) => (
          <div key={field} className="flex justify-between items-center border-b pb-2">
            <div>
              <strong className="capitalize">{field.replace('_', ' ')}:</strong>{' '}
              {editingField === field ? (
                field === 'gender' ? (
                  <select
                    className="ml-2 border px-2 py-1"
                    value={fieldValues[field]}
                    onChange={(e) => handleChange(field, e.target.value)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                ) : (
                  <input
                    className="ml-2 border px-2 py-1"
                    type={field === 'age' ? 'number' : 'text'}
                    value={fieldValues[field]}
                    onChange={(e) => handleChange(field, e.target.value)}
                  />
                )
              ) : (
                <span className="ml-2">{profile[field as keyof Profile]}</span>
              )}
            </div>
            {editingField === field ? (
              <button
                className="text-blue-600 hover:underline text-sm"
                onClick={() => handleSave(field)}
              >
                Save
              </button>
            ) : (
              <button
                className="text-blue-600 hover:underline text-sm"
                onClick={() => handleEdit(field)}
              >
                Edit
              </button>
            )}
          </div>
        ))}

        <div className="flex justify-between items-center border-b pb-2">
          <div>
            <strong>Role:</strong> <span className="ml-2">{role}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col space-y-2">
          <button
            className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800"
            onClick={() => router.push('/registration/membership')}
          >
            Manage Membership
          </button>

          <button
            className="text-cyan-700 underline text-sm"
            onClick={handleToggleNotifications}
          >
            {showNotifications ? 'Hide Notification Settings' : 'Show Notification Settings'}
          </button>

          {showNotifications && (
            <div className="mt-2 border rounded p-4 space-y-2">
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
    </div>
  );
}
