'use client';

import React from 'react';

export default function BusinessApprovalCard({ 
  product = {
    name: "Men’s Leather Shoe",
    category: "Shoes",
    price: 25000,
    image: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=300", // Fallback example matching the leather shoe vibe
    status: "Pending",
    date: "May 24, 2026",
    time: "10:12AM"
  },
  onViewDetails,
  onApprove,
  onReject
}) {
  return (
    <div className="w-full max-w-5xl bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:shadow-md transition-all duration-300">
      
      {/* Left Block: Image & Basic Metadata info */}
      <div className="flex flex-1 items-start gap-5">
        {/* Product Thumbnail Box */}
        <div className="w-32 h-32 flex-shrink-0 bg-[#e2e2e2] rounded-xl overflow-hidden border border-slate-200/60 shadow-inner relative group">
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        {/* Core Product Information Strings */}
        <div className="flex flex-col h-32 justify-between py-1">
          <div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
              {product.name}
            </h3>
            <p className="text-sm font-medium text-slate-500 mt-0.5">
              {product.category}
            </p>
            <p className="text-xl font-extrabold text-slate-950 mt-3 flex items-center">
              <span className="font-sans mr-0.5">₦</span>
              {product.price.toLocaleString()}
            </p>
          </div>

          {/* View Details Interactive Secondary Button */}
          <button
            type="button"
            onClick={onViewDetails}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all duration-200 w-fit"
          >
            {/* Outline Eye Icon */}
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Details
          </button>
        </div>
      </div>

      {/* Right Block: Status Indicator, Timestamps & Controls */}
      <div className="flex flex-col items-end justify-between h-32 py-1 min-w-[240px] w-full sm:w-auto">
        
        {/* Status Badge & Timestamp Row */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-1">
          {/* Status Pill Badge */}
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-amber-200/70 bg-[#fffbeb] text-amber-800 text-xs font-bold shadow-sm">
            {/* Tiny Watch/Clock Icon */}
            <svg className="w-3.5 h-3.5 text-amber-600/90" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {product.status}
          </div>
          
          {/* Timestamp Subtexts */}
          <div className="text-[10px] font-bold text-slate-500 text-right uppercase tracking-wider mt-1">
            <p>{product.date}</p>
            <p className="text-slate-400 font-medium">{product.time}</p>
          </div>
        </div>

        {/* Action Controls Panel */}
        <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          
          {/* Approve Control Block Button */}
          <button
            type="button"
            onClick={onApprove}
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
  );
}