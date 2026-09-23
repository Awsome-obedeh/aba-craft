"use client";

export default function BusinessSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select business type",
  error,
}) {
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