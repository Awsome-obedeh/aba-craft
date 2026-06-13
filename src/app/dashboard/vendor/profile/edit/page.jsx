'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // Added missing router import

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
    const router = useRouter(); // Initialized missing router hook
    const [loading, setLoading] = useState(true);
    const { user, accessToken } = useAuthStore();
    
    // Unified form state containing safe initial default fallbacks
    const [formData, setFormData] = useState({
        vendorInfo: {},
        businessInfo: {}
    });

    const role = user?.role;
    const email = user?.email;

    // Authentication Guard useEffect
    useEffect(() => {
        if (!accessToken && !user) {
            router.push('/auth/sign-in');
            return;
        }
        if (user && user.role !== "vendor" && user.role !== "admin") {
            router.replace("/dashboard/products");
            return;
        }
    }, [accessToken, user, router]);

    // Handle inputs for nested structures safely
    const handleNestedInputChange = (section, e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [section]: {
                ...prev[section],
                [name]: value
            }
        }));
    };

    const fetchUserDetails = async () => {
        try {
            const res = await api.get('/vendor/profile');
            const vendorProfile = res.data?.formattedResponse?.vendorInfo || {};
            const businessProfile = res.data?.formattedResponse?.businessInfo || {};

            // Populate the single form state
            setFormData({
                vendorInfo: vendorProfile,
                businessInfo: businessProfile
            });
            setLoading(false);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load profile details.");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserDetails();
    }, []);

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        try {
            // Sends the completely updated structure to the backend
            await api.patch('/vendor/profile', formData);
            toast.success('Changes saved successfully!');
        } catch (error) {
            console.error('Error submitting form: ', error);
            if (error.response) {
                toast.error(error.response.data?.message || "Something went wrong");
            } else if (error.request) {
                toast.error("Network error. Check your internet connection.");
            } else {
                toast.error("Unexpected error occurred");
            }
        }
    };

    return (
        <DashboardLayout role={role} email={email}>
            <div className="min-h-screen bg-gray-50/50 flex items-center justify-center p-0 sm:p-4 md:p-6 font-sans antialiased">
                <div className="w-full max-w-7xl bg-white border border-gray-200 shadow-xl rounded-none sm:rounded-2xl overflow-hidden relative">
                    
                    <header className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white z-10">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 border-b-2 inline-block pb-0.5">
                                Edit Vendor Profile
                            </h1>
                            <p className="text-xs text-gray-500 mt-1">
                                Update your business and verification information
                            </p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="hidden md:inline text-xs text-gray-400">
                                {formData.vendorInfo?.lastUpdated || " "}
                            </span>
                            <button
                                type="button"
                                onClick={handleFormSubmit}
                                className="bg-black hover:bg-gray-800 text-white text-xs font-semibold py-2.5 px-5 rounded-lg transition-colors shadow-sm"
                            >
                                Save Changes
                            </button>
                        </div>
                    </header>

                    <form onSubmit={handleFormSubmit} className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        <div className="space-y-6">
                            <ProfileSection />
                            
                            {/* Pass explicit scoped sub-states down alongside targeted contextual onChange events */}
                            <PersonalDetailsSection 
                                data={formData.vendorInfo} 
                                onChange={(e) => handleNestedInputChange('vendorInfo', e)} 
                                loading={loading}
                            />
                            <BankDetailsSection 
                                data={formData.businessInfo} 
                                onChange={(e) => handleNestedInputChange('businessInfo', e)} 
                            />
                        </div>

                        <div className="space-y-6">
                            <BusinessDetailsSection 
                                data={formData.businessInfo} 
                                onChange={(e) => handleNestedInputChange('businessInfo', e)} 
                            />
                            <LocationSection 
                                data={formData.vendorInfo} 
                                onChange={(e) => handleNestedInputChange('vendorInfo', e)} 
                            />
                            <UploadDocumentsSection />
                        </div>

                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}