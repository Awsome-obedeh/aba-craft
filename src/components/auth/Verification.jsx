export default function VerificationIcon() {
  return (
    <div className="flex flex-col items-center text-center">
      <svg
        width="100"
        height="90"
        viewBox="0 0 100 90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shield */}
        <path
          d="
            M50 5
            L82 16
            V39
            C82 59 69 74 50 84
            C31 74 18 59 18 39
            V16
            L50 5Z
          "
          stroke="#303030"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Check */}
        <path
          d="M35 42L46 51L66 31"
          stroke="#303030"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <h3 className="mt-[5px] text-[15px] font-semibold text-[#303030]">
        Secure verification
      </h3>

      <p className="mt-[5px] text-xs leading-relaxed text-[#333]">
        Verify your email with a 6-digit code
      </p>

      <p className="mt-[3px] text-xs font-medium text-[#333]">
        Complete verification to continue
      </p>

      {/* Security message */}
      <div className="mt-[26px] flex items-center gap-1 text-xs text-[#444]">
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
        >
          <rect
            x="5"
            y="10"
            width="14"
            height="10"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />

          <path
            d="M8 10V7a4 4 0 018 0v3"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>

        Your information is safe with us
      </div>
    </div>
  );
}