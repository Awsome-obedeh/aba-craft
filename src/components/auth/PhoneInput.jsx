"use client";

export default function PhoneInput({
  label,
  countryCode,
  onCountryCodeChange,
  phone,
  onPhoneChange,
  error,
}) {
  const countryCodes = [
    {
      code: "+234",
      country: "NG",
      flag: "🇳🇬",
    },
    {
      code: "+233",
      country: "GH",
      flag: "🇬🇭",
    },
    {
      code: "+254",
      country: "KE",
      flag: "🇰🇪",
    },
    {
      code: "+27",
      country: "ZA",
      flag: "🇿🇦",
    },
    {
      code: "+1",
      country: "US",
      flag: "🇺🇸",
    },
    {
      code: "+44",
      country: "UK",
      flag: "🇬🇧",
    },
  ];

  return (
    <div className="w-full">
      <label className="mb-[5px] block text-xs font-medium text-[#444]">
        {label}
      </label>

      <div
        className={`
          flex
          h-11
          w-full
          overflow-hidden
          rounded-lg
          border
          bg-white
          ${
            error
              ? "border-[#ff5c64]"
              : "border-[#d2d2d2]"
          }
        `}
      >
        {/* Country selector */}
        <div className="relative flex w-[88px] shrink-0 items-center border-r border-[#d2d2d2]">
          <select
            value={countryCode}
            onChange={onCountryCodeChange}
            className="
              absolute
              inset-0
              z-10
              w-full
              cursor-pointer
              appearance-none
              bg-transparent
              opacity-0
            "
          >
            {countryCodes.map((country) => (
              <option
                key={country.code}
                value={country.code}
              >
                {country.flag} {country.code}
              </option>
            ))}
          </select>

          {countryCodes.map(
            (country) =>
              country.code === countryCode && (
                <div
                  key={country.code}
                  className="flex items-center gap-[6px] px-[9px]"
                >
                  <span className="text-xs">
                    {country.flag}
                  </span>

                  <span className="text-xs font-medium text-[#333]">
                    {country.code}
                  </span>
                </div>
              )
          )}

          <svg
            width="7"
            height="7"
            viewBox="0 0 24 24"
            fill="none"
            className="absolute right-[7px] text-[#333]"
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Phone number */}
        <input
          type="tel"
          value={phone}
          onChange={onPhoneChange}
          placeholder="Enter phone number"
          className="
            min-w-0
            flex-1
            bg-transparent
            px-[9px]
            text-xs
            text-[#222]
            outline-none
            placeholder:text-[#b8b8b8]
          "
        />
      </div>

      {error && (
        <p className="mt-[4px] text-xs text-[#ff3f48]">
          {error}
        </p>
      )}
    </div>
  );
}