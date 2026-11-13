'use client';

import StaffDashboard from '@/components/dashboard/StaffDashboard';

// Access is enforced by src/middleware.ts; the dashboard API checks the role again.
export default function AdminDashboard() {
  return <StaffDashboard variant="admin" />;
}
