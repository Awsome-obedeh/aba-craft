export default function RoleFeature({ children }) {
  return (
    <li className="flex items-center gap-[5px]">
      <span className="flex h-[8px] w-[8px] shrink-0 items-center justify-center rounded-full border border-[#888]">
        <svg
          width="5"
          height="5"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M6 12l4 4 8-8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <span className="text-[13px]  leading-relaxed text-[#333] text-black">
        {children}
      </span>
    </li>
  );
}