"use client";

export default function BusinessInput({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  error,
}) {
  return (
    <div className="w-full">
      <label className="mb-[5px] block text-xs font-medium text-[#444]">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`
          h-11
          w-full
          rounded-lg
          border
          bg-white
          px-[9px]
          text-xs
          text-[#222]
          outline-none
          placeholder:text-[#b8b8b8]
          transition
          focus:border-[#777]
          ${
            error
              ? "border-[#ff5c64]"
              : "border-[#d2d2d2]"
          }
        `}
      />

      {error && (
        <p className="mt-[4px] text-xs text-[#ff3f48]">
          {error}
        </p>
      )}
    </div>
  );
}