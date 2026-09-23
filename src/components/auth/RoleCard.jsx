"use client";

import RoleFeature from "./RoleFeature";

export default function RoleCard({
  role,
  title,
  description,
  features,
  selected,
  onSelect,
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(role)}
      className={`
        relative
        flex
        min-h-[168px]
        w-full
        flex-col
        rounded-lg
        justify-center
        border
        p-[9px]
        text-left
        transition-all
        duration-150
        ${
          selected
            ? "border-[#777] bg-[#f8f8f8]"
            : "border-brandBorder bg-[#f8f8f8] hover:border-[#999]"
        }
      `}
      aria-pressed={selected}
    >
      {/* Radio */}
      <span
        className={`
          absolute
          right-[9px]
          top-[7px]
          flex
          h-[9px]
          w-[9px]
          items-center
          justify-center
          rounded-full
          border
          ${
            selected
              ? "border-[#222] bg-forest"
              : "border-[#aaa] bg-transparent"
          }
        `}
      >
        {selected && (
          <span className="h-[3px] w-[3px] rounded-full bg-white" />
        )}
      </span>

      {/* Title */}
      <h3 className="pr-[18px] text-[24px] font-medium leading-relaxed text-[#222] py-3">
        {title}
      </h3>

      {/* Description */}
      <p className="mt-[8px] max-w-[185px] text-[13.8px] leading-[20px]  text-[#333] py-4">
        {description}
      </p>

      {/* Features */}
      <ul className="mt-[10px] space-y-[5px]">
        {features.map((feature) => (
          <RoleFeature key={feature}>
            {feature}
          </RoleFeature>
        ))}
      </ul>
    </button>
  );
}