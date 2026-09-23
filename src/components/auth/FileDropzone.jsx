"use client";

import { useRef, useState } from "react";

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function FileDropzone({
  value,
  onChange,
}) {
  const inputRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  const validateFile = (file) => {
    if (!file) return false;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(
        "Please upload a JPG, PNG, WEBP or PDF file."
      );

      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File size must not exceed 10MB.");

      return false;
    }

    setError("");

    return true;
  };

  const handleFile = (file) => {
    if (!validateFile(file)) return;

    onChange(file);
  };

  const handleInputChange = (event) => {
    const file = event.target.files?.[0];

    if (file) {
      handleFile(file);
    }

    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();

    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();

    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleBrowse = () => {
    inputRef.current?.click();
  };

  const handleRemove = () => {
    onChange(null);
    setError("");
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        onChange={handleInputChange}
      />

      <div
        onClick={!value ? handleBrowse : undefined}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          flex
          min-h-[144px]
          w-full
          items-center
          justify-center
          rounded-[8px]
          border
          border-dashed
          px-5
          py-4
          transition
          ${
            isDragging
              ? "border-[#b99426] bg-[#faf7ed]"
              : "border-[#c8c8c8] bg-[#f7f7f7]"
          }
          ${
            !value
              ? "cursor-pointer hover:bg-[#f2f2f2]"
              : ""
          }
        `}
      >
        {!value ? (
          <div className="text-center">
            {/* Upload icon */}
            <div className="mb-2 flex justify-center">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M12 16V4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />

                <path
                  d="M8 8l4-4 4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M5 13v4a3 3 0 003 3h8a3 3 0 003-3v-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <p className="text-xs text-[#444]">
              Drag & drop your document here
            </p>

            <p className="mt-1 text-xs text-[#999]">
              or click to browse ? JPG, PNG, WEBP or PDF ? up to 10 MB
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Uploaded status */}
            <div className="flex items-center gap-2">
              <span className="flex h-[13px] w-[13px] items-center justify-center rounded-full border border-[#55c878] text-[#36b95d]">
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M5 12l4 4L19 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>

              <span className="text-xs text-[#333]">
                File selected
              </span>
            </div>

            {/* File name */}
            <p className="mt-1 max-w-[350px] truncate text-xs text-[#555]">
              {value.name}
            </p>

            {/* Actions */}
            <div className="mt-1 flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();

                  if (
                    value.type.startsWith("image/")
                  ) {
                    const url = URL.createObjectURL(value);

                    window.open(
                      url,
                      "_blank",
                      "noopener,noreferrer"
                    );
                  } else {
                    const url = URL.createObjectURL(value);

                    window.open(
                      url,
                      "_blank",
                      "noopener,noreferrer"
                    );
                  }
                }}
                className="underline hover:text-black"
              >
                View
              </button>

              <span>|</span>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleBrowse();
                }}
                className="underline hover:text-black"
              >
                Replace
              </button>

              <span>|</span>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleRemove();
                }}
                className="underline hover:text-black"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}