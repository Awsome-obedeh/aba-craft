"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSignup } from "@/app/context/SignupContext";
import { sendSignupCode, verifySignupCode, signupError } from "@/app/lib/signup";
import OtpInput from "./OtpInput";
import VerificationIcon from "./VerificationIcon";

export default function VerifyAccount() {
  const router = useRouter();
  const { signupData, setVerificationToken } = useSignup();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const pending = useRef(false);
  const initialRequest = useRef(null);
  const email = signupData.account.email;

  useEffect(() => {
    if (!email) return;
    let active = true;
    // Reuse the request when Strict Mode replays the effect in development.
    if (initialRequest.current?.email !== email) {
      pending.current = true;
      initialRequest.current = { email, promise: sendSignupCode(email) };
    }
    initialRequest.current.promise.then(() => {
      if (!active) return;
      setSent(true);
      setOtp("");
      setTimeLeft(60);
    }).catch((error) => {
      if (active) setError(signupError(error));
    }).finally(() => {
      if (!active) return;
      pending.current = false;
      setLoading(false);
    });
    return () => { active = false; };
  }, [email]);

  useEffect(() => {
    if (!timeLeft) return;
    const timer = setTimeout(() => setTimeLeft((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleRequest = async (verify) => {
    if (pending.current || (verify ? !/^\d{6}$/.test(otp) : timeLeft > 0)) return;
    pending.current = true;
    setLoading(true);
    setError("");
    try {
      if (verify) {
        const result = await verifySignupCode(signupData.account.email, otp);
        if (typeof result?.verificationToken !== "string" || !result.verificationToken) {
          throw new Error("Verification could not be confirmed. Please try again.");
        }
        setVerificationToken(result.verificationToken);
        router.push("/auth/sign-up/role");
      } else {
        await sendSignupCode(signupData.account.email);
        setSent(true);
        setOtp("");
        setTimeLeft(60);
      }
    } catch (error) {
      setError(signupError(error));
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="flex px-[18px] pb-5 pt-2">
      <div className="flex w-[48%] items-center justify-center border-r border-[#bdbdbd] pr-5">
        <VerificationIcon />
      </div>
      <div className="w-[52%] pl-3">
        <h2 className="text-lg font-semibold">Verify Your Account</h2>
        <p className="mt-2 text-sm">{sent ? "Enter the six-digit code sent to " : loading ? "Sending a verification code to " : "We could not send a code to "}{email}.</p>
        <button type="button" disabled={loading} onClick={() => router.push("/auth/sign-up")} className="my-2 text-sm underline">Change email address</button>
        <fieldset disabled={loading} className="mt-4">
          <OtpInput value={otp} onChange={setOtp} />
          <button type="button" disabled={timeLeft > 0 || loading} onClick={() => handleRequest(false)} className="mt-4 text-sm underline disabled:opacity-50">
            {loading && !sent ? "Sending code..." : sent ? "Resend code" : "Try sending again"}
          </button>
          {timeLeft > 0 && <p className="mt-2 text-xs" role="status">You can request another code in {timeLeft}s.</p>}
          <button type="button" disabled={!/^\d{6}$/.test(otp) || loading} onClick={() => handleRequest(true)} className="mt-5 w-full rounded bg-[#c39a22] py-3 text-sm text-white disabled:opacity-50">
            {loading ? "Please wait..." : "Verify code"}
          </button>
        </fieldset>
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
