"use client";

import { useRouter } from "next/navigation";
import SignupStepper from "./SignupStepper";

export default function SignupLayout({
  currentStep = 1,
  children,
}) {
  const router = useRouter();

  return (
    <main className="signup-shell relative min-h-screen bg-forest px-4 py-8">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('/singup-bg.jpg')",
        }}
      />

      <div className="absolute inset-0 bg-black/65" />

      <section
        className="
          relative z-10
          mx-auto
          flex
           max-w-[1120px]
          min-h-[500px]
          w-full
          overflow-hidden
          rounded-[24px]
          bg-cream
          shadow-[0_20px_60px_rgba(0,0,0,0.35)]
          mt-10
        "
      >
        <SignupStepper currentStep={currentStep} />

        <div className="min-w-0 flex-1 py-5">
          <div className="flex items-center justify-between px-5 pt-2 sm:px-8">
            <button
              type="button"
              onClick={() => router.push(["/auth/sign-up", "/auth/sign-up/verify", "/auth/sign-up/role", "/auth/sign-up/business"][currentStep - 2] || "/auth/sign-up")}
              className="
                flex
                h-9
                items-center
                gap-1
                rounded-lg
                border
                border-[#cfcfcf]
                bg-white
                px-2
                text-xs
                text-[#333]
                hover:bg-[#f3f3f3]
              "
            >
              <span>←</span>
              Back
            </button>

            <button
              type="button"
              className="flex items-center gap-1 text-xs"
            >
              <span className="flex h-[11px] w-[11px] items-center justify-center rounded-full border border-[#555] text-xs">
                ?
              </span>
              Need help?
            </button>
          </div>

          {children}
        </div>
      </section>
    </main>
  );
}