"use client";

import { useState } from "react";

export default function PasswordInput({
  label,
  placeholder,
  value,
  onChange,
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full">
      <label className="mb-1.5 block text-[16px] text-[#555]">
        {label}
      </label>

      <div className="flex h-11 items-center rounded-lg border border-[#D9D9D9] bg-white px-2.5 focus-within:border-[#777]">
        {/* Lock icon */}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          className="mr-2 shrink-0 text-[#B5B5B5]"
        >
          <rect
            x="4"
            y="10"
            width="16"
            height="11"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />

          <path
            d="M8 10V7a4 4 0 0 1 8 0v3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>

        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="
            h-full
            min-w-0
            flex-1
            bg-transparent
            text-[13px]
            outline-none
            placeholder:text-[#B8B8B8]
          "
        />

        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="ml-2 text-[#B5B5B5] hover:text-[#555]"
          aria-label={
            showPassword
              ? "Hide password"
              : "Show password"
          }
        >
          {showPassword ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M3 3l18 18"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              <path
                d="M10.6 10.6a2 2 0 002.8 2.8"
                stroke="currentColor"
                strokeWidth="1.5"
              />

              <path
                d="M9.9 4.2A10.8 10.8 0 0112 4c5 0 8.5 4 9.5 6a13 13 0 01-3.1 3.8M6.2 6.2C4.4 7.3 3.3 8.9 2.5 10c1 2 4.5 6 9.5 6 1 0 1.9-.2 2.7-.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />

              <circle
                cx="12"
                cy="12"
                r="2.5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          )}
        </button>
      </div>

      {label === "Create Password" && (
        <p className="mt-1 text-[12px] text-[#444]">
          Use at least 8 characters
        </p>
      )}
    </div>
  );
}