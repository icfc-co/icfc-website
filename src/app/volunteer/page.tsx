'use client';

import AdminMessagesButton from '@/components/admin/AdminMessagesButton';


export default function VolunteerDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Welcome, Volunteer</h1>
      <p>This is the Volunteer dashboard.</p>
    

    <div className="mt-4">
        <AdminMessagesButton />
       </div>
       </div>
       <div className="mt-6">
          <SocialServiceManagerButton />
       </div>
       <div className="mt-6">
          <PhotoManagerButton />
       </div>
  );
}
