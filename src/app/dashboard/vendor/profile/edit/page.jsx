'use client';

import React, { useEffect, useState } from 'react';

import { PersonalDetailsSection } from '@/components/vendor/PersonalDetailsSection';
import { BankDetailsSection } from '@/components/vendor/BankDetailsSection';
import { BusinessDetailsSection } from '@/components/vendor/BusinessDetailsSection';
import { LocationSection } from '@/components/vendor/LocationSection';
import { UploadDocumentsSection } from '@/components/vendor/UploadDocumentsSection';
import { ProfileSection } from '@/components/vendor/ProfileSection';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/app/store/authStore';
import { api } from '@/app/lib/axios';
import { toast } from 'react-toastify';

export default function EditProfilePage() {
    const [loading, setLoading]=useState(true);
    const [vendorInfo, setVendorInfo] = useState({});
    const [businessInfo, setBusinessInfo]= useState({});
    const [formData, setFormData]=useState({});
    const { user, accessToken } = useAuthStore();
    const role = user?.role;
    const email = user?.email;

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
   

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        try{

            await api.patch('/vendor/profile', formData);
            
        }
        catch (error) {
            console.error('Error submitting form: ', error);
             if (error.response) {
                toast.error(
                    error.response.data.message ||
                    "Something went wrong"
                );
            }

            // Network error
            else if (error.request) {
                toast.error(
                    "Network error. Check your internet connection."
                );
            }

            // Unexpected error
            else {
                toast.error(
                    "Unexpected error occurred"
                );
            }
            toast.error('Failed to save changes. Please try again.');
        }
        console.log('Submitted Payload: ', formData);

       

     
    };

     const fetchUserDetails=async ()=>{
     
            const res= await api.get('/vendor/profile');
            const vendorProfile=res.data?.formattedResponse.vendorInfo;
            const businessProfile=res.data?.formattedResponse.businessInfo;

            setVendorInfo(vendorProfile);
            setBusinessInfo(businessProfile);
            setLoading(false);

        };
        console.log("VENDORINFO:" ,vendorInfo, "BUSINESS INFO",businessInfo)

        useEffect(()=>{
            fetchUserDetails();
        },[])

    return (

        <DashboardLayout role={role} email={email} >

                            
                <div className="min-h-screen bg-gray-50/50 flex items-center justify-center p-0 sm:p-4 md:p-6 font-sans antialiased">
                    <div className="w-full max-w-7xl bg-white border border-gray-200 shadow-xl rounded-none sm:rounded-2xl overflow-hidden relative">

                       
                        <header className="px-6 py-4 border-b border-gray-200 flex items-center justify-between  bg-white z-10">
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 border-b-2 border-[button-bg] inline-block pb-0.5">
                                    Edit Vendor Profile
                                </h1>
                                <p className="text-xs text-gray-500 mt-1">
                                    Update your business and verification information
                                </p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <span className="hidden md:inline text-xs text-gray-400">
                                    {vendorInfo.lastUpdated || " "}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleFormSubmit}
                                    className="bg-black hover:bg-gray-800 text-white text-xs font-semibold py-2.5 px-5 rounded-lg transition-colors shadow-sm"
                                >
                                    Save Changes
                                </button>
                                <button type="button" className="text-gray-400 hover:text-gray-600 p-1">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </header>

                       
                        <form onSubmit={handleFormSubmit} className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

                           
                            <div className="space-y-6">
                                <ProfileSection />
                                <PersonalDetailsSection data={vendorInfo} onChange={handleInputChange} loading={loading}/>
                                <BankDetailsSection data={businessInfo} onChange={handleInputChange} />
                            </div>


                            <div className="space-y-6">
                                <BusinessDetailsSection data={businessInfo} onChange={handleInputChange} />
                                <LocationSection data={vendorInfo} onChange={handleInputChange} />
                                <UploadDocumentsSection />
                            </div>

                        </form>

                    </div>
                </div>


        </DashboardLayout>
    );
}