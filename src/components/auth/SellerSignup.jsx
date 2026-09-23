"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSignup } from "@/app/context/SignupContext";
import SignupStepper from "./SignupStepper";
import PasswordInput from "./PasswordInput";
import SignupInput from "./SignInput";

export default function SellerSignup() {
  const router = useRouter();
  const { signupData, updateAccount } = useSignup();
  const form = signupData.account;
  const [submitted, setSubmitted] = useState(false);
  const updateField = (field, value) => updateAccount({ [field]: value });

  const passwordMismatch =
    form.confirmPassword.length > 0 &&
    form.password !== form.confirmPassword;

  const passwordTooShort =
    form.password.length > 0 &&
    form.password.length < 8;

  const passwordTooLong = new TextEncoder().encode(form.password).length > 72;

  const isValid = useMemo(() => {
    return (
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) &&
      form.password.length >= 8 &&
      new TextEncoder().encode(form.password).length <= 72 &&
      form.confirmPassword === form.password &&
      form.acceptedTerms
    );
  }, [form]);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!isValid) {
      setSubmitted(true);
      return;
    }

    router.push("/auth/sign-up/verify");
  };

  return (
    <main className="signup-shell relative flex min-h-screen items-center justify-center overflow-hidden bg-forest px-4 py-8">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('/singup-bg.jpg')",
        }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/65" />

      {/* Signup Card */}
      <section
        className="relative z-10 flex w-full max-w-[1120px] min-h-[620px] overflow-hidden
          rounded-[9px]
          bg-[#f8f8f8]
          shadow-[0_15px_50px_rgba(0,0,0,0.3)]"
      >
        {/* Left stepper */}
        <SignupStepper currentStep={1} />

        {/* Right content */}
        <div className="min-w-0 flex-1 px-5 py-3.5 md:px-10 md:py-8 ">
      
          
          {/* Heading */}
          <div className="mb-4">
            <h2 className="text-[18px] font-semibold leading-tight text-[#303030]">
              Create Your Account
            </h2>

            <p className="mt-1 text-[12px] leading-[16px] text-[#555]">
              Create an account to start selling your leather goods
              <br />
              on Abacrafts
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-2">
              {/* Email */}
              <SignupInput
                label="Email Address"
                type="email"
                placeholder="Enter email address"
                value={form.email}
                onChange={(e) =>
                  updateField("email", e.target.value)
                }
                icon={
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M4 5h16v14H4z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />

                    <path
                      d="m4 7 8 6 8-6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                }
              />

              {/* Password */}
              <PasswordInput
                label="Create Password"
                placeholder="Enter password"
                value={form.password}
                onChange={(e) =>
                  updateField("password", e.target.value)
                }
              />

              {passwordTooShort && (
                <p className="-mt-1 text-[12px] text-red-500">
                  Password must contain at least 8 characters.
                </p>
              )}

              {passwordTooLong && (
                <p className="text-xs text-red-500">Password is too long. Use at most 72 bytes.</p>
              )}

              {/* Confirm Password */}
              <PasswordInput
                label="Confirm Password"
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={(e) =>
                  updateField(
                    "confirmPassword",
                    e.target.value
                  )
                }
              />

              {passwordMismatch && (
                <p className="-mt-1 text-xs text-red-500">
                  Passwords do not match.
                </p>
              )}
            </div>

            {/* Password match */}
            <label className="mt-1.5 flex cursor-pointer items-center gap-1">
              <input
                type="checkbox"
                checked={
                  form.password.length > 0 &&
                  form.password === form.confirmPassword
                }
                readOnly
                className="h-[9px] w-[9px] accent-black"
              />

              <span className="text-xs text-[#444]">
                Password Match
              </span>
            </label>

            {/* Terms */}
            <label className="mt-5 flex cursor-pointer items-start gap-1.5">
              <input
                type="checkbox"
                checked={form.acceptedTerms}
                onChange={(e) =>
                  updateField(
                    "acceptedTerms",
                    e.target.checked
                  )
                }
                className="mt-[1px] h-[10px] w-[10px] shrink-0 accent-black"
              />

              <span className="text-xs leading-relaxed text-[#444]">
                I agree to Abacrafts’s{" "}
                <a
                  href="/terms"
                  className="underline underline-offset-2"
                >
                  Terms & Conditions
                </a>{" "}
                and{" "}
                <a
                  href="/privacy"
                  className="underline underline-offset-2"
                >
                  Privacy Policy
                </a>
              </span>
            </label>

            {/* Submit */}
            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={!isValid}
                className="
                  h-11
                  w-[180px]
                  rounded-lg
                   bg-[#B4902A]/60
                  font-[12px]
                  font-medium
                  text-[#ffff]
                  transition
                  text-black
                  enabled:bg-[#B4902A]
                  enabled:hover:bg-[#B4902A]/90
                  disabled:cursor-not-allowed
                  disabled:opacity-80
                "
              >
                Continue
              </button>
            </div>

            {/* Login */}
            <p className="mt-1 text-center text-xs text-[#444]">
              Already have an account?{" "}
              <a
                href="/auth/sign-in"
                className="font-medium underline underline-offset-2"
              >
                Log in
              </a>
            </p>

            {submitted && !isValid && (
              <p className="mt-2 text-center text-xs text-red-500">
                Please complete the required fields.
              </p>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}
