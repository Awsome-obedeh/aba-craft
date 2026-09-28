"use client";

import { useState } from "react";

export default function BvnInput({
  value,
  onChange,
  error,
}) {
  const [editing, setEditing] = useState(!value);

  const isComplete = value.length === 11;

  const formatBvn = (bvn) => {
    if (!bvn) return "";

    const lastFour = bvn.slice(-4);

    if (bvn.length === 11) {
      return `${"\u2022".repeat(7)} ${lastFour}`;
    }

    return bvn;
  };

  const handleChange = (event) => {
    const digits = event.target.value
      .replace(/\D/g, "")
      .slice(0, 11);

    onChange(digits);
  };

  if (!editing && isComplete) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div
            className="
              flex
              h-11
              w-full max-w-[363px]
              items-center
              rounded-lg
              border
              border-[#cfcfcf]
              bg-white
              px-[9px]
            "
          >
            <span className="text-[12px] text-[#333]">
              {formatBvn(value)}
            </span>
          </div>

          {error && (
            <p className="mt-1 text-xs text-red-500">
              {error}
            </p>
          )}
        </div>

        <div className="ml-5 flex min-w-[65px] flex-col items-start">
          <div className="flex items-center gap-1">
            <span
              className="
                flex
                h-[14px]
                w-[14px]
                items-center
                justify-center
                rounded-full
                border
                border-[#54c878]
                text-[#35bd5e]
              "
            >
              <svg
                width="8"
                height="8"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M5 12l4 4L19 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <span className="text-xs text-[#333]">
              Entered
            </span>
          </div>

          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-[5px] ml-[19px] text-xs underline"
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <input
        type="text"
        inputMode="numeric"
        maxLength={11}
        value={value}
        onChange={handleChange}
        placeholder="Enter your 11-digit BVN"
        className={`
          h-11
          w-full max-w-[363px]
          rounded-lg
          border
          bg-white
          px-[9px]
          text-xs
          text-[#333]
          outline-none
          placeholder:text-[#aaa]
          focus:border-[#777]
          ${
            error
              ? "border-red-400"
              : "border-[#cfcfcf]"
          }
        `}
      />

      {error && (
        <p className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}

      {isComplete && (
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="mt-1 text-xs underline"
        >
          Done
        </button>
      )}
    </div>
  );
}
