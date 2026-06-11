"use client";

import { useAuthStore } from '@/app/store/authStore'
import DashboardLayout from '@/components/layout/DashboardLayout'
import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation';

export default function VendorDashboardPage() {
    const {user, accessToken}=useAuthStore();
    const router = useRouter();

     const role = user?.role;
    const email = user?.email;
  return (
    <DashboardLayout role={role} email={email}>
        <p>Vendor page</p>
    </DashboardLayout>
  )
}
