'use client';

import AdminMessagesButton from '@/components/admin/AdminMessagesButton';
import PhotoManagerButton from '@/components/admin/PhotoManagerButton';

export default function AdminDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Welcome, Admin</h1>
      <p>This is your dashboard.</p>

       
       <div className="mt-4">
        <AdminMessagesButton />
       </div>
       <div className="mt-6">
          <PhotoManagerButton />
       </div>
    </div>
  );
}
