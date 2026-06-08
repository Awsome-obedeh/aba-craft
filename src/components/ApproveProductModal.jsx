import React, { useEffect } from 'react';
import { FcApproval } from "react-icons/fc";
import { CiCircleCheck } from "react-icons/ci";

export const ApproveProductModal = ({ isOpen, onClose, onConfirm, slug, loading}) => {
    // Prevent background scrolling when modal is active
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-slate-100 transform transition-all duration-300">

                {/* Core Layout */}
                <div className="flex flex-col items-center gap-4">
                    {/* Aesthetic Warning Icon Wrapper */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center ">
                        <FcApproval size={34} />
                    </div>

                    {/* Information Area */}
                    <div className="space-y-1 mx-auto text-center">
                       
                        <h3 className="text-lg font-bold text-black  tracking-tight leading-relaxed">
                            Are you sure you want to Approve            </h3>
                        <p className="text-md text-black ">"{slug}"?</p>
                        <p className="text-md text-black ">This product will become visible in the market places for buyers. </p>

                    </div>
                </div>

                {/* Dynamic Buttons */}
                <div className="mt-8 flex items-center justify-center gap-3 ">
                    <button
                        type="button"
                        onClick={onClose}
                        className=" border border-black px-6 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`px-5 py-2.5 flex items-center gap-3 text-sm font-semibold text-white  ${loading ? 'bg-gray-500' : 'bg-black'}    hover:bg-black/70 active:bg-black/80 shadow-sm shadow-green-500/20 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500/50`}
                    > 
                      {loading ? "Approving..." : "Approve Product"} <CiCircleCheck size={30} />
                    </button>
                </div>

            </div>
        </div>
    );
};