"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, CircleHelp, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { registerBuyer, sendSignupCode, signupError, verifySignupCode } from "@/app/lib/signup";
import { buyerEmailError, buyerPasswordError } from "@/app/lib/buyer-validation";

export default function CustomerSignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [digits, setDigits] = useState(Array(6).fill(""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [help, setHelp] = useState(false);
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [expiresAt, setExpiresAt] = useState(0);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(0);
  const inputs = useRef([]);
  const pending = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const cooldown = Math.max(0, Math.ceil((resendAt - now) / 1000));

  async function sendCode(event) {
    event?.preventDefault();
    if (pending.current) return;
    const errors = { email: buyerEmailError(email), password: step === 1 ? buyerPasswordError(password) : "" };
    setFieldErrors(errors);
    if (errors.email || errors.password) {
      document.getElementById(errors.email ? "buyer-email" : "buyer-signup-password")?.focus();
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const normalized = email.trim().toLowerCase();
      const result = step === 1
        ? await registerBuyer(normalized, password)
        : await sendSignupCode(normalized);
      const time = Date.now();
      setEmail(normalized);
      setNow(time);
      setExpiresAt(time + result.expiresIn * 1000);
      setResendAt(time + result.retryAfter * 1000);
      setDigits(Array(6).fill(""));
      setSent(step === 2);
      setStep(2);
      setPassword("");
      sessionStorage.removeItem("buyerSignup");
    } catch (error) {
      if (step === 1 && error.response?.status === 409) {
        setFieldErrors((previous) => ({ ...previous, email: signupError(error) }));
      } else setError(signupError(error));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function verify(event) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await verifySignupCode(email, digits.join(""));
      sessionStorage.removeItem("buyerSignup");
      setVerified(true);
      toast.success("Your buyer account is ready. Sign in to continue.");
      router.replace("/auth/sign-in");
    } catch (error) {
      setError(signupError(error));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function enterDigits(index, value) {
    const clean = value.replace(/\D/g, "").slice(0, 6 - index);
    setDigits((previous) => {
      const next = [...previous];
      if (!clean) next[index] = "";
      else [...clean].forEach((digit, offset) => { next[index + offset] = digit; });
      return next;
    });
    setError("");
    if (clean) inputs.current[Math.min(index + clean.length, 5)]?.focus();
  }
  function changeEmail() {
    setStep(1);
    setError("");
    setFieldErrors({});
    setDigits(Array(6).fill(""));
    sessionStorage.removeItem("buyerSignup");
  }
  const buttonClass = "min-h-10 w-full rounded bg-[#b39126] px-4 py-2 text-sm font-medium text-white hover:bg-[#9b7c1d] disabled:cursor-not-allowed disabled:opacity-50";
  return (
    <main className="relative flex min-h-svh items-center justify-center bg-[#282522] px-4 py-10 text-neutral-900">
      <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/singup-bg.jpg')" }} />
      <div aria-hidden="true" className="absolute inset-0 bg-black/70" />
      <section inert={sent} aria-label="Buyer signup" className="relative flex w-full max-w-[940px] overflow-hidden rounded-xl bg-[#f5f5f5] shadow-2xl">
        <aside className="hidden w-52 shrink-0 bg-white px-6 py-14 md:block">
          <Link href="/" className="text-xl font-semibold">Abacrafts</Link>
          <ol className="mt-8 space-y-8">
            {["Create account", "Verify account"].map((label, index) => <li key={label} aria-current={step === index + 1 ? "step" : undefined} className="flex items-center gap-3 text-xs"><span className={`flex size-8 shrink-0 items-center justify-center rounded-full border ${step === index + 1 ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"}`}>{index + 1 < step ? <Check size={14} /> : index + 1}</span>{label}</li>)}
          </ol>
        </aside>
        <div className="min-w-0 flex-1 px-6 pb-12 pt-5 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            {step === 1 ? <Link href="/auth/sign-in" className="inline-flex min-h-9 items-center gap-2 rounded border border-neutral-300 bg-white px-3 text-xs"><ArrowLeft size={13} /> Back</Link> : <button disabled={busy || verified} onClick={changeEmail} className="inline-flex min-h-9 items-center gap-2 rounded border border-neutral-300 bg-white px-3 text-xs disabled:opacity-50"><ArrowLeft size={13} /> Back</button>}
            <button type="button" onClick={() => setHelp(!help)} aria-expanded={help} aria-controls="buyer-help" className="inline-flex min-h-9 items-center gap-2 text-xs"><CircleHelp size={13} /> Need help?</button>
          </div>
          {help && <p id="buyer-help" className="mt-4 rounded border border-neutral-200 bg-white p-3 text-sm">Use an email address you can access. Check your inbox and spam folder for the code. You can request another code after one minute.</p>}
          <p className="mt-5 text-xs text-neutral-500 md:hidden">Abacrafts · Step {step} of 2</p>
          <div className="mt-8 grid gap-8 sm:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col items-center justify-center text-center sm:border-r sm:border-neutral-300 sm:pr-6">
              {step === 1 ? <Mail size={88} strokeWidth={1.2} aria-hidden="true" /> : <ShieldCheck size={104} strokeWidth={1.1} aria-hidden="true" />}
              <h2 className="mt-5 text-lg font-medium">{step === 1 ? "Your buyer journey starts here" : "Secure verification"}</h2>
              <p className="mt-2 text-xs leading-6">{step === 1 ? "Discover handcrafted goods from Aba artisans." : "We’ve sent a 6-digit code to"}</p>
              {step === 2 && <p className="mt-1 break-all text-sm font-semibold">{email}</p>}
              <p className="mt-8 flex items-center gap-2 text-[10px]"><LockKeyhole size={11} /> Your information is safe with us</p>
            </div>
            <div className="py-2">
              <h1 className="text-2xl font-semibold">{verified ? "Email verified" : step === 1 ? "Create a buyer account" : "Verify Your Account"}</h1>
              {verified ? <div role="status" className="mt-5"><span className="inline-flex size-12 items-center justify-center rounded-full bg-green-100 text-green-600"><Check /></span><p className="mt-4 text-sm leading-6">Your buyer account is ready. Redirecting to sign in...</p></div> : <>
                <p className="mt-2 text-xs leading-5 text-neutral-600">{step === 1 ? "Enter your email address to get started. We’ll send you a verification code." : "Enter the 6-digit verification code we sent to your email."}</p>
                <form noValidate className="mt-6" onSubmit={step === 1 ? sendCode : verify} aria-busy={busy}>
                  {step === 1 ? <>
                    <label htmlFor="buyer-email" className="text-sm">Email address</label>
                    <input id="buyer-email" type="email" autoComplete="email" required disabled={busy} maxLength={254} value={email} onBlur={() => setFieldErrors((previous) => ({ ...previous, email: buyerEmailError(email) }))} onChange={(event) => { setEmail(event.target.value); setFieldErrors((previous) => ({ ...previous, email: previous.email ? buyerEmailError(event.target.value) : "" })); }} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? "buyer-email-error" : undefined} placeholder="Enter your email address" className={`mt-2 min-h-11 w-full rounded border ${fieldErrors.email ? "border-red-500" : "border-neutral-300"} bg-white px-3 text-sm outline-none focus:border-[#b39126] focus:ring-2 focus:ring-[#b39126]/20`} />
                    {fieldErrors.email && <p id="buyer-email-error" role="alert" className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
                    <label htmlFor="buyer-signup-password" className="mt-5 block text-sm">Password</label>
                    <div className={`mt-2 flex items-center gap-2 rounded border ${fieldErrors.password ? "border-red-500" : "border-neutral-300"} bg-white pl-3 pr-1 focus-within:border-[#b39126] focus-within:ring-2 focus-within:ring-[#b39126]/20`}>
                      <LockKeyhole size={14} aria-hidden="true" className="shrink-0 text-neutral-400" />
                      <input id="buyer-signup-password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} disabled={busy} value={password} onBlur={() => setFieldErrors((previous) => ({ ...previous, password: buyerPasswordError(password) }))} onChange={(event) => { setPassword(event.target.value); setFieldErrors((previous) => ({ ...previous, password: previous.password ? buyerPasswordError(event.target.value) : "" })); setError(""); }} aria-invalid={!!fieldErrors.password} aria-describedby={fieldErrors.password ? "buyer-signup-password-error" : "buyer-signup-password-rules"} placeholder="Create a password" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="flex size-11 shrink-0 items-center justify-center text-neutral-500">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                    </div>
                    {fieldErrors.password && <p id="buyer-signup-password-error" role="alert" className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
                    <p id="buyer-signup-password-rules" className="mt-2 text-xs text-neutral-600">Use at least 8 characters.</p>
                  </> : <>
                    <fieldset disabled={busy} aria-describedby={error ? "buyer-error" : undefined}><legend className="sr-only">Six-digit email verification code</legend><div className="flex gap-2">
                      {digits.map((digit, index) => <input key={index} ref={(element) => { inputs.current[index] = element; }} aria-label={`Digit ${index + 1}`} aria-invalid={!!error} type="text" inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} value={digit} onChange={(event) => enterDigits(index, event.target.value)} onPaste={(event) => { event.preventDefault(); enterDigits(index, event.clipboardData.getData("text")); }} onFocus={(event) => event.target.select()} onKeyDown={(event) => { if (event.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus(); if (event.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus(); if (event.key === "ArrowRight" && index < 5) inputs.current[index + 1]?.focus(); }} className={`h-11 min-w-0 w-full max-w-10 rounded border bg-transparent text-center text-lg outline-none focus:ring-2 focus:ring-[#b39126]/30 ${error ? "border-red-500" : "border-neutral-400"}`} />)}
                    </div></fieldset>
                    {error && <p id="buyer-error" role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
                    <p className="mt-5 text-xs" role="timer">{remaining > 0 ? `Code expires in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : "Code expired. Request a new code."}</p>
                    <p className="mt-3 text-xs">Didn’t receive the code? <button type="button" disabled={busy || cooldown > 0} onClick={() => sendCode()} className="font-semibold underline disabled:opacity-50">{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}</button></p>
                  </>}
                  {step === 1 && error && <p id="buyer-error" role="alert" className="mt-3 text-xs text-red-600">{error}</p>}
                  <button type="submit" disabled={busy || (step === 2 && (digits.join("").length !== 6 || remaining === 0))} className={`mt-6 ${buttonClass}`}>{busy ? "Please wait…" : step === 1 ? "Continue" : "Verify code"}</button>
                </form>
                {step === 2 ? <><div className="my-4 flex items-center gap-3 text-xs text-neutral-500"><span className="h-px flex-1 bg-neutral-300" />or<span className="h-px flex-1 bg-neutral-300" /></div><button disabled={busy} onClick={changeEmail} className="min-h-10 w-full border border-neutral-300 text-xs disabled:opacity-50">Change email address</button></> : <p className="mt-5 text-center text-xs text-neutral-600">Already have an account? <Link href="/auth/sign-in" className="font-medium underline">Sign in</Link></p>}
              </>}
            </div>
          </div>
        </div>
      </section>
      {sent && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"><section role="dialog" aria-modal="true" aria-labelledby="code-sent-title" className="w-full max-w-sm rounded-lg bg-white p-7 text-center shadow-xl"><span className="mx-auto flex size-12 items-center justify-center rounded-full bg-green-100 text-green-600"><Check /></span><h2 id="code-sent-title" className="mt-4 text-xl font-semibold">Code sent!</h2><p className="mt-2 text-sm text-neutral-600">Your new code has been sent to your email.</p><button autoFocus onClick={() => { setSent(false); inputs.current[0]?.focus(); }} className={`mt-5 ${buttonClass}`}>Continue to verification</button></section></div>}
    </main>
  );
}
