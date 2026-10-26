import React, { useEffect, useState } from 'react';
import { FiX, FiAlertTriangle } from "react-icons/fi";

export const RejectProductModal = ({ isOpen, onClose, onConfirm, productName, loading }) => {
    const [rejectionReason, setRejectionReason] = useState('');

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

    const handleConfirm = () => {
        if (rejectionReason.trim()) {
            onConfirm(rejectionReason);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-slate-100 transform transition-all duration-300">

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                >
                    <FiX size={20} />
                </button>

                {/* Core Layout */}
                <div className="flex flex-col items-center gap-4">
                    {/* Aesthetic Warning Icon Wrapper */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                        <FiAlertTriangle size={24} className="text-amber-600" />
                    </div>

                    {/* Information Area */}
                    <div className="space-y-1 mx-auto text-center">
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                            Reject Product
                        </h3>
                        <p className="text-sm text-slate-600">{productName} will be rejected and removed from the pending queue.</p>
                    </div>
                </div>

                {/* Rejection Reason Input */}
                <div className="mt-6">
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                        Reason for rejection
                    </label>
                    <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Please provide a reason for rejecting this product..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-none"
                        rows={3}
                    />
                </div>

                {/* Dynamic Buttons */}
                <div className="mt-8 flex items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={loading || !rejectionReason.trim()}
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Rejecting..." : "Reject Product"}
                    </button>
                </div>

            </div>
        </div>
    );
};