// app/vendor/profile/page.jsx
"use client";
import VerificationTable from "@/components/Verification";
import PersonalDetailsCard from "@/components/PersonalDetailsCard";
import BusinessDetailsCard from "@/components/BusinessDetailsCard";
import TeamPermissions from "@/components/TeamPermissions";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/app/store/authStore";
import Link from "next/link";
import { api } from "@/app/lib/axios";




export default function VendorProfilePage() {
  const { user, accessToken } = useAuthStore();
  const [vendor, setVendor] = useState({});
  const [loading, setLoading] = useState(false);
  const [businessInfo, setBusinessInfo] = useState({});
  // const vendor = {
  //   fullName: "Flourish Adaeze",
  //   email: "adaeze01@gmail.com",
  //   phone: "+2347022234466",
  //   sex: "Female",
  //   avatar:
  //     "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
  //   location: "Aba, Nigeria",
  //   verificationStatus: "Pending Verification",

  //   business: {
  //     name: "Golden Even Services",
  //     category: "Aba Handmade LeatherWorks",
  //     address:
  //       "No. 30 2nd Powerline By Ariaria Aba, Abia State Nigeria",
  //     type: "Sole Proprietorship",
  //     description:
  //       "We create premium handmade leather products crafted with attention to detail combining durability, functionality and timeless style.",
  //   },
  // };


  useEffect(() => {
    if (!accessToken && !user) {
      router.push('/auth/sign-in');
      return;
    }
    if (user && user.role !== "vendor" && user.role !== "admin") {
      router.replace("/dashboard/products");
      return;
    }


  }, [accessToken, user]);

  const role = user?.role;
  const email = user?.email;


  const fetchUserDetails = async () => {
    setLoading(true)
    const res = await api.get('/vendor/profile');

    const vendorProfile = res.data?.formattedResponse.vendorInfo;
    const businessProfile = res.data?.formattedResponse.businessInfo;
    setBusinessInfo(businessProfile);
    console.log("RESPONSE", vendorProfile);
    setVendor(vendorProfile);

  };

  useEffect(() => {
    fetchUserDetails();
  }, [])
  console.log("VENDOR PROFILE", vendor, "loading", loading);


  return (

    <DashboardLayout role={role} email={email}>
      <main className="space-y-6 p-6">
        <Link href="/dashboard/vendor/profile/edit" className="inline-flex items-center px-4 py-2   button-bg text-white rounded-md hover:bg-blue-700 transition-colors duration-200">
          Edit Profile
        </Link>


        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <PersonalDetailsCard vendor={vendor} loading={loading} />
          <BusinessDetailsCard business={businessInfo} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-1 gap-6">
          <div className="xl:col-span-2">
            <VerificationTable />
          </div>
{/* 
          <TeamPermissions /> */}
        </div>
      </main>
    </DashboardLayout>
  );
}