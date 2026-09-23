"use client";

import FileDropzone from "./FileDropzone";

export default function DocumentUploadCard({
  number,
  title,
  description,
  file,
  onFileChange,
  children,
}) {
  return (
    <section
      className="
        rounded-2xl
        border
        border-brandBorder
        bg-white
        px-[22px]
        py-[16px]
      "
    >
      {/* Heading */}
      <div className="flex items-start gap-[9px]">
        {/* Number */}
        <span
          className="
            flex
            h-[25px]
            w-[25px]
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-forest
            text-xs
            font-medium
            text-white
          "
        >
          {number}
        </span>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-semibold leading-[20px] text-[#333]">
            {title}
          </h2>

          <p className="mt-[3px] text-xs leading-relaxed text-[#333]">
            {description}
          </p>
        </div>
      </div>

      {/* Upload area */}
      <div className="mt-[12px] pl-[26px]">
        <FileDropzone
          value={file}
          onChange={onFileChange}
        />
        {children}
      </div>
    </section>
  );
}
