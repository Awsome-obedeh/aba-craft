"use client";

import React, { useId } from "react";

export function CheckBox({
  label,
  description,
  className = "",
  checked = true,
  disabled = false,
  id,
  ...props
}) {
  // Generate a unique ID for accessible input-to-label pairing
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <label
      htmlFor={inputId}
      className={`
        flex items-start gap-3 p-4 rounded-xl border select-none cursor-pointer transition-all duration-200
        ${checked ? "bg-blue-50/50 border-blue-500 shadow-sm" : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"}
        ${disabled ? "opacity-50 cursor-not-allowed bg-slate-50 border-slate-200" : ""}
        ${className}
      `}
    >
      <div className="relative flex items-center h-5 mt-0.5">
        {/* Native Hidden Input (Keeps full accessibility, keyboard focus, and form binding) */}
        <input
          {...props}
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          className="peer sr-only"
        />

        {/* Custom Decorative Box */}
        <div
          className={`
            w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200
            peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2
            ${checked 
              ? "bg-blue-600 border-blue-600 scale-100 shadow-sm shadow-blue-600/20" 
              : "bg-white border-slate-300 scale-100"
            }
          `}
        >
          {/* Animated SVG Check Icon */}
          <svg
            className={`w-3.5 h-3.5 text-white stroke-[3.5] transition-all duration-200 transform
              ${checked ? "scale-100 opacity-100" : "scale-50 opacity-0"}
            `}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      {/* Text Content Block */}
      <div className="flex flex-col gap-0.5">
        <span className={`text-sm font-semibold tracking-tight transition-colors ${checked ? "text-blue-900" : "text-slate-700"}`}>
          {label}
        </span>
        {description && (
          <span className="text-xs text-slate-500 font-medium leading-normal">
            {description}
          </span>
        )}
      </div>
    </label>
  );
}