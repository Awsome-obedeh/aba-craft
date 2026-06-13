"use client"
import { api } from '@/app/lib/axios';
import { useAuthStore } from '@/app/store/authStore';
import DashboardLayout from '@/components/layout/DashboardLayout';
import BusinessApprovalCard from '@/components/vendor/BusinessApprovalCard';
import VendorApprovalCard from '@/components/vendor/VendorApprovalCard'


import React, { use, useEffect, useState } from 'react'
import { toast } from 'react-toastify';

export default function SingleVendorPage({params}) {
// server way to use useParams
 const { user, accessToken } = useAuthStore();

 const [vendor, setVendor]=useState({})
 const [business, setBusiness]=useState({})
const [loading, setLoading]=useState(true);


  useEffect(() => {
    if (!accessToken && !user) {
      router.push('/auth/sign-in');
    }


  }, [user, accessToken]);

  const role = user?.role;
  const email = user?.email;
    const {id}= use(params)

    const getVendorInfo=async ()=>{
        try{
            setLoading(false)
            const res=await api.get(`/vendor/profile/${id}`);
            setVendor(res.data.formattedResponse.vendorInfo);
            setBusiness(res.data.formattedResponse.businessInfo);
        }

        catch(error){
            setLoading(true)
            console.error("ERROR", error.message);
            toast.error(error.response.data.message || "Error fetching Vendor information.")
        }
    }

    useEffect(()=>{
        getVendorInfo();
    },[])
console.log("BUSINESS INFO", business, "VENDOR INFO", vendor)
 
  return (

    <DashboardLayout role={role} email={email}>

    <div className="flex justify-center flex-col gap-6 items-center"> 
      <p>Vendor single page</p>
      <VendorApprovalCard loading={loading} vendor={vendor} id={id}/>
      {/* <BusinessApprovalCard loading={loading} business={business}/> */}
    </div>
    </DashboardLayout>
  )
}
