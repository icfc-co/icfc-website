'use client';

import { useEffect } from 'react';
import { refreshRole } from '@/lib/refreshRole';

export default function RefreshRole() {
  useEffect(() => {
    refreshRole();
  }, []);

  return null; // doesn’t render anything visible
}
