'use client';

import { formatDate } from '@/utils/DateFormater';
import React from 'react';
import { SkeletonCard } from '../skeletons/SkeletonCard';
import { api } from '@/app/lib/axios';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';


export default function VendorApprovalCard({
    loading,
    vendor, id,
    onApprove,
    onReject })
    {
        
        const router=useRouter();
    const ApproveVendorStatus = async () => {
        const res = await api.patch(`/api/vendor/rofile/${id}`);
        toast.success("Vendor Verified");
        router.refresh();
    }




    return (


        <>

            {
                !loading ? (
                    <div className="w-full max-w-5xl bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:shadow-md transition-all duration-300">

                        {/* Left Block: Image & Basic Metadata info */}
                        <div className="flex flex-1 items-start gap-5">
                            {/* Product Thumbnail Box */}

                            {/* Core Product Information Strings */}
                            <div className="flex flex-col h-42 justify-between py-1">
                                <div>
                                    {/* <p className='text-center text-lg font-bold w-[100%] bg-red-600'>Vendor Bio</p> */}
                                    <h3 className="text-xl  py-2 font-bold text-slate-900 tracking-tight leading-snug">
                                        {vendor.fullName}
                                    </h3>
                                    <p className="text-xl  py-2 font-bold text-slate-900 tracking-tight leading-snug">
                                        {vendor.phoneNumber}
                                    </p>
                                    <p className="text-sm  py-2 font-medium text-slate-500 mt-0.5">
                                        {vendor.email}
                                    </p>
                                    <p className=" text-slate-950 mt-3 flex items-center">

                                        {vendor.role}
                                    </p>
                                </div>

                                {/* View Details Interactive Secondary Button */}

                            </div>
                        </div>

                        {/* Right Block: Status Indicator, Timestamps & Controls */}
                        <div className="flex flex-col items-end justify-between h-32 py-1 min-w-[240px] w-full sm:w-auto">

                            {/* Status Badge & Timestamp Row */}
                            <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-1">
                                {/* Status Pill Badge */}
                                <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border ${vendor.verificationStatus === 'verified' ? 'badge-approved' : vendor.verificationStatus === 'pending' ? 'badge-review' : 'badge-banned'} text-xs font-bold shadow-sm`}>
                                    {/* Tiny Watch/Clock Icon */}
                                    <svg className={`w-3.5 h-3.5 ${vendor.verificationStatus === 'verified' ? 'badge-approved' : vendor.verificationStatus === 'pending' ? 'badge-review' : 'badge-banned'}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {vendor.verificationStatus} 
                                </div>

                                {/* Timestamp Subtexts */}
                                <div className="text-[10px] font-bold text-slate-500 text-right uppercase tracking-wider mt-1">
                                    <p>{formatDate(vendor.joinedDate)}</p>
                                    {/* <p className="text-slate-400 font-medium">{formatDate(vendor.joinedDate)}</p> */}
                                </div>
                            </div>

                            {/* Action Controls Panel */}
                            <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">

                                {/* Approve Control Block Button */}
                                <button
                                    type="button"
                                    onClick={()=>ApproveVendorStatus}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-6 py-3 text-xs font-bold text-slate-950 bg-[#99ff81] hover:bg-[#82eb6b] border border-[#7ae363] rounded-xl shadow-sm hover:shadow transition-all duration-200 min-w-[110px]"
                                >
                                    {/* Checkmark Badge Icon */}
                                    <svg className="w-4 h-4 text-emerald-950" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Approve
                                </button>

                                {/* Reject Control Block Button */}
                                <button
                                    type="button"
                                    onClick={onReject}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-6 py-3 text-xs font-bold text-slate-950 bg-[#ffd1d1] hover:bg-[#fca9a9] border border-[#f59e9e] rounded-xl shadow-sm hover:shadow transition-all duration-200 min-w-[110px]"
                                >
                                    {/* Cancel Circle Icon */}
                                    <svg className="w-4 h-4 text-rose-800" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    Reject
                                </button>

                            </div>
                        </div>

                    </div>
                ) : <SkeletonCard />
            }
        </>

    );
}