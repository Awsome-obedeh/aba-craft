"use client";

export default function SignupInput({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  icon,
  error,
}) {
  return (
    <div className="w-full">
      <label className="mb-1.5 block text-[15px] text-[#555]">
        {label}
      </label>

      <div
        className={`
          flex h-11 items-center rounded-lg border
          bg-white px-2.5
          transition
          focus-within:border-[#777]
          ${
            error
              ? "border-red-400"
              : "border-[#D9D9D9]"
          }
        `}
      >
        {icon && (
          <span className="mr-2 text-[#B5B5B5]">
            {icon}
          </span>
        )}

        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="
            h-full
            min-w-0
            flex-1
            bg-transparent
            text-[13px]
            text-[#222]
            outline-none
            placeholder:text-[#B8B8B8]
          "
        />
      </div>

      {error && (
        <p className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}