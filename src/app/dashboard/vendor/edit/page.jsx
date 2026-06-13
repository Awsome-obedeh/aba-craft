'use client';

import React, { useEffect, useState } from 'react';

import { PersonalDetailsSection } from '@/components/vendor/PersonalDetailsSection';
import { BankDetailsSection } from '@/components/vendor/BankDetailsSection';
import { BusinessDetailsSection } from '@/components/vendor/BusinessDetailsSection';
import { LocationSection } from '@/components/vendor/LocationSection';
import { UploadDocumentsSection } from '@/components/vendor/UploadDocumentsSection';
import { ProfileSection } from '@/components/vendor/ProfileSection';
import DashboardLayout from '@/app/dashboard/layout';
import { useAuthStore } from '@/app/store/authStore';
import { useRouter } from 'next/navigation';

export default function EditProfilePage() {
    const { user, accessToken } = useAuthStore();
    const role = user?.role;
    const email = user?.email;
    const router = useRouter()

    useEffect(() => {
        if (!accessToken && !user) {
            router.push('/auth/sign-in');
            return;
        }



    }, [accessToken, user]);
    const [formData, setFormData] = useState({



    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        console.log('Submitted Payload: ', formData);
        alert('Changes saved successfully!');
    };

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
                                Last Updated 14 May 2026
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
                            <PersonalDetailsSection data={formData} onChange={handleInputChange} />
                            <BankDetailsSection data={formData} onChange={handleInputChange} />
                        </div>


                        <div className="space-y-6">
                            <BusinessDetailsSection data={formData} onChange={handleInputChange} />
                            <LocationSection data={formData} onChange={handleInputChange} />
                            <UploadDocumentsSection />
                        </div>

                    </form>

                </div>
            </div>


        </DashboardLayout>
    );
}