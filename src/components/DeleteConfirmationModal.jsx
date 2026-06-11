import React, { useEffect } from 'react';
import { MdDelete } from "react-icons/md";

export const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, productName }) => {
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
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-red-500">
                        <MdDelete size={24} />
                    </div>

                    {/* Information Area */}
                    <div className="space-y-1 mx-auto text-center">
                       
                        <h3 className="text-lg font-bold text-black  tracking-tight leading-relaxed">
                            Are you sure you want to delete             </h3>
                        <p className="text-md text-black ">{productName}?</p>
                        <p className="text-md text-black ">This action is permanent and cannot be undone. </p>

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
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-rose-600 active:bg-rose-700 shadow-sm shadow-rose-500/20 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                    >
                        Delete Product
                    </button>
                </div>

            </div>
        </div>
    );
};