"use client";

import { useId } from "react";

export default function BusinessSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select business type",
  error,
  multiple = false,
}) {
  const id = useId();
  if (multiple) {
    const selected = Array.isArray(value) ? value : value ? [value] : [];
    return (
      <fieldset className="w-full" aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`} aria-invalid={Boolean(error)}>
        <legend className="mb-[5px] text-xs font-medium text-[#444]">{label}</legend>
        <p id={`${id}-hint`} className="mb-2 text-xs text-[#555]">Select all that apply.</p>
        <div className={`grid gap-2 rounded-lg border bg-white p-3 ${error ? "border-[#ff5c64]" : "border-[#d2d2d2]"}`}>
          {options.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2 text-xs text-[#222]">
              <input
                type="checkbox"
                name="businessType"
                value={option.value}
                checked={selected.includes(option.value)}
                onChange={(event) => onChange(event.target.checked
                  ? [...selected, option.value]
                  : selected.filter((type) => type !== option.value))}
                className="h-4 w-4 accent-[#bf9726] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bf9726]"
              />
              {option.label}
            </label>
          ))}
        </div>
        {error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-[#ff3f48]">{error}</p>}
      </fieldset>
    );
  }
  return (
    <div className="w-full">
      <label className="mb-[5px] block text-xs font-medium text-[#444]">
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          className={`
            h-11
            w-full
            appearance-none
            rounded-lg
            border
            bg-white
            px-[9px]
            pr-[28px]
            text-xs
            outline-none
            transition
            focus:border-[#777]
            ${
              value
                ? "text-[#222]"
                : "text-[#555]"
            }
            ${
              error
                ? "border-[#ff5c64]"
                : "border-[#d2d2d2]"
            }
          `}
        >
          <option value="" disabled>
            {placeholder}
          </option>

          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>

            // when other is chosen, show a text input for the user to specify their business type
          ))}
        </select>

        {/* Chevron */}
        <span className="pointer-events-none absolute right-[10px] top-1/2 -translate-y-1/2 text-[#555]">
          <svg
            width="8"
            height="8"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      {error && (
        <p className="mt-[4px] text-xs text-[#ff3f48]">
          {error}
        </p>
      )}
    </div>
  );
}
