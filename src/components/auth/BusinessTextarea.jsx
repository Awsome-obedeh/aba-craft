"use client";

export default function BusinessTextarea({
  label,
  placeholder,
  value,
  onChange,
  maxWords = 300,
  error,
}) {
  const wordCount = value.trim()
    ? value.trim().split(/\s+/).length
    : 0;

  const isOverLimit = wordCount > maxWords;

  const handleChange = (event) => {
    const text = event.target.value;

    const words = text.trim()
      ? text.trim().split(/\s+/)
      : [];

    if (words.length <= maxWords) {
      onChange(event);
    }
  };

  return (
    <div className="w-full">
      <label className="mb-[5px] block text-xs font-medium text-[#444]">
        {label}
      </label>

      <div className="relative">
        <textarea
          aria-label={label}
          aria-invalid={Boolean(error)}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          rows={3}
          className="
            h-[61px]
            w-full
            resize-none
            rounded-lg
            border
            border-[#d2d2d2]
            bg-white
            px-[9px]
            py-[8px]
            text-xs
            leading-relaxed
            text-[#222]
            outline-none
            placeholder:text-[#b8b8b8]
            focus:border-[#777]
          "
        />

        <span
          className={`
            absolute
            bottom-[7px]
            right-[8px]
            text-xs
            ${
              isOverLimit
                ? "text-red-500"
                : "text-[#aaa]"
            }
          `}
        >
          {wordCount}/{maxWords} words
        </span>
      </div>
      {error && <p role="alert" className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
