import React, { useEffect } from 'react';

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
        <div className="flex items-start gap-4">
          {/* Aesthetic Warning Icon Wrapper */}
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </div>
          
          {/* Information Area */}
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
              Delete this product?
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Are you sure you want to delete <span className="font-medium text-slate-800">"{productName}"</span>? This action is permanent and cannot be undone.
            </p>
          </div>
        </div>

        {/* Dynamic Buttons */}
        <div className="mt-8 flex items-center justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={onConfirm}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 active:bg-rose-700 shadow-sm shadow-rose-500/20 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          >
            Delete Product
          </button>
        </div>

      </div>
    </div>
  );
};