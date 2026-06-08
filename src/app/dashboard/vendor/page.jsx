"use client";

import { useAuthStore } from '@/app/store/authStore'
import DashboardLayout from '@/components/layout/DashboardLayout'
import React, { useEffect } from 'react'

export default function VendorDashboardPage() {
    const {user, accessToken}=useAuthStore();

    useEffect(()=>{
         if (!accessToken && !user) {
            router.push('/auth/sign-in');
        }


    }, [user, accessToken]);

     const role = user?.role;
    const email = user?.email;
  return (
    <DashboardLayout role={role} email={email}>
        <p>Vendor page</p>
    </DashboardLayout>
  )
}
