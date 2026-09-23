"use client";

import { useEffect, useRef } from "react";

export default function OtpInput({
  value,
  onChange,
  length = 6,
}) {
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index, inputValue) => {
    const digit = inputValue.replace(/\D/g, "").slice(-1);

    const otpArray = value.split("");

    otpArray[index] = digit;

    const nextValue = otpArray.join("").slice(0, length);

    onChange(nextValue);

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace") {
      if (!value[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }

    if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();

    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);

    if (!pasted) return;

    onChange(pasted);

    const nextIndex = Math.min(
      pasted.length,
      length - 1
    );

    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex gap-[10px]">
      {Array.from({ length }).map((_, index) => {
        const digit = value[index] || "";

        return (
          <input
            key={index}
            ref={(element) => {
              inputRefs.current[index] = element;
            }}
            value={digit}
            maxLength={1}
            inputMode="numeric"
            autoComplete="one-time-code"
            onChange={(event) =>
              handleChange(
                index,
                event.target.value
              )
            }
            onKeyDown={(event) =>
              handleKeyDown(index, event)
            }
            onPaste={handlePaste}
            className="
              h-[30px]
              w-[25px]
              rounded-lg
              border
              border-[#bdbdbd]
              bg-[#f8f8f8]
              text-center
              text-[13px]
              font-medium
              text-[#222]
              outline-none
              transition
              focus:border-[#222]
              focus:ring-1
              focus:ring-[#222]/20
            "
          />
        );
      })}
    </div>
  );
}