"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, CircleHelp, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { buyerEmailError, buyerPasswordError, buyerConfirmationError } from "@/app/lib/buyer-validation";
import { useAuthStore } from "@/app/store/authStore";

async function request(action, body) {
  const response = await fetch(`/api/auth/buyer-password/${action}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || "Unable to complete your request.");
  return result;
}

export default function BuyerForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState(Array(6).fill(""));
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState({});
  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);
  const [modal, setModal] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(0);
  const inputs = useRef([]);
  const pending = useRef(false);
  const emailError = touched.email ? buyerEmailError(email) : "";
  const passwordError = touched.password ? buyerPasswordError(password) : "";
  const confirmationError = touched.confirmation ? buyerConfirmationError(password, confirmation) : "";
  const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const cooldown = Math.max(0, Math.ceil((resendAt - now) / 1000));

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (modal !== "success") return;
    const timer = setTimeout(() => router.replace("/auth/sign-in"), 3500);
    return () => clearTimeout(timer);
  }, [modal, router]);

  async function sendCode() {
    const result = await request("send-code", { email: email.trim().toLowerCase() });
    const time = Date.now();
    setEmail(email.trim().toLowerCase());
    setNow(time);
    setExpiresAt(time + result.expiresIn * 1000);
    setResendAt(time + result.retryAfter * 1000);
    setToken("");
    setDigits(Array(6).fill(""));
    setStep(2);
    setModal("sent");
  }
  async function submit(event, resend = false) {
    event?.preventDefault();
    if (pending.current) return;
    setError("");
    if (step === 1) {
      setTouched({ email: true });
      if (buyerEmailError(email)) return;
    }
    if (step === 2 && !resend && (digits.join("").length !== 6 || !remaining)) {
      setError(remaining ? "Enter the six-digit verification code." : "The code has expired. Request a new code.");
      return;
    }
    if (step === 3) {
      setTouched({ password: true, confirmation: true });
      if (buyerPasswordError(password) || buyerConfirmationError(password, confirmation)) return;
    }
    pending.current = true;
    setBusy(true);
    try {
      if (step === 1 || resend) await sendCode();
      else if (step === 2) {
        const result = await request("verify", { email, otp: digits.join("") });
        setToken(result.token);
        setStep(3);
        setTouched({});
      } else {
        await request("reset", { email, token, password, confirmPassword: confirmation });
        setPassword(""); setConfirmation(""); setToken("");
        useAuthStore.getState().clearAuth();
        setModal("success");
      }
    } catch (error) { setError(error.message || "Network error. Please try again."); }
    finally { pending.current = false; setBusy(false); }
  }
  function changeEmail() {
    setStep(1); setToken(""); setError(""); setTouched({}); setPassword(""); setConfirmation("");
  }
  function enterDigits(index, value) {
    const clean = value.replace(/\D/g, "").slice(0, 6 - index);
    setDigits((previous) => { const next = [...previous]; if (!clean) next[index] = ""; [...clean].forEach((digit, offset) => { next[index + offset] = digit; }); return next; });
    setError("");
    if (clean) inputs.current[Math.min(index + clean.length, 5)]?.focus();
  }
  const button = "min-h-10 rounded bg-[#b39126] px-5 py-2 text-sm font-medium text-white hover:bg-[#9b7c1d] disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500";
  return <main className="relative flex min-h-svh items-center justify-center bg-[#282522] px-4 py-10 text-neutral-900">
    <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/singup-bg.jpg')" }} /><div aria-hidden="true" className="absolute inset-0 bg-black/65" />
    <section inert={!!modal} aria-labelledby="forgot-title" className="relative w-full max-w-[820px] rounded-xl bg-[#f5f5f5] px-6 pb-12 pt-5 shadow-2xl sm:px-10">
      <div className="flex items-center justify-between">
        {step === 1 ? <Link href="/auth/sign-in" className="inline-flex min-h-9 items-center gap-2 rounded border border-neutral-300 bg-white px-3 text-xs"><ArrowLeft size={13} /> Back</Link> : <button type="button" disabled={busy} onClick={changeEmail} className="inline-flex min-h-9 items-center gap-2 rounded border border-neutral-300 bg-white px-3 text-xs"><ArrowLeft size={13} /> Back</button>}
        <button type="button" aria-expanded={help} aria-controls="forgot-help" onClick={() => setHelp(!help)} className="inline-flex min-h-9 items-center gap-2 text-xs"><CircleHelp size={13} /> Need help?</button>
      </div>
      {help && <p id="forgot-help" className="mt-4 rounded border border-neutral-200 bg-white p-3 text-sm">Enter the email on your buyer account. Check your inbox and spam folder. Codes expire in 15 minutes and can be resent after one minute.</p>}
      <div className={step === 2 ? "mt-7 grid gap-8 sm:grid-cols-[0.9fr_1.1fr]" : "mx-auto mt-5 max-w-xl"}>
        {step === 2 && <div className="flex flex-col items-center justify-center text-center sm:border-r sm:border-neutral-300 sm:pr-8"><ShieldCheck size={104} strokeWidth={1.1} /><h2 className="mt-5 text-lg font-medium">Secure verification</h2><p className="mt-2 text-xs">We sent a 6-digit code to</p><p className="mt-2 break-all text-sm font-semibold">{email}</p><p className="mt-8 flex items-center gap-2 text-[10px]"><LockKeyhole size={11} /> Your information is safe with us</p></div>}
        <div><h1 id="forgot-title" className="text-2xl font-semibold">{step === 1 ? "Forgot your password?" : step === 2 ? "Verify Your Account" : "Create a new password"}</h1>
          <p className="mt-1 text-sm leading-5 text-neutral-600">{step === 1 ? "Enter the email address linked to your buyer account and we will send you a verification code." : step === 2 ? "Enter the 6-digit verification code sent to your email." : "Choose a strong password you have not used before."}</p>
          <form noValidate onSubmit={submit} aria-busy={busy} className="mt-6">
            {step === 1 && <><label htmlFor="reset-email" className="text-xs text-neutral-600">Email address</label><input id="reset-email" type="email" autoComplete="email" disabled={busy} value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} onBlur={() => setTouched({ email: true })} aria-invalid={!!(emailError || error)} aria-describedby="reset-email-error" placeholder="Enter your email address" className={`mt-2 min-h-11 w-full rounded border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#b39126]/30 ${emailError || error ? "border-red-500" : "border-neutral-200"}`} /><p id="reset-email-error" role="alert" className="mt-1 text-xs text-red-600">{emailError || error}</p></>}
            {step === 2 && <><fieldset disabled={busy} aria-describedby="reset-code-error"><legend className="sr-only">Six-digit verification code</legend><div className="flex gap-2">{digits.map((digit, index) => <input key={index} ref={(element) => { inputs.current[index] = element; }} aria-label={`Digit ${index + 1}`} aria-invalid={!!error} type="text" inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} value={digit} onChange={(event) => enterDigits(index, event.target.value)} onPaste={(event) => { event.preventDefault(); enterDigits(index, event.clipboardData.getData("text")); }} onFocus={(event) => event.target.select()} onKeyDown={(event) => { if (event.key === "Backspace" && !digit && index > 0) inputs.current[index - 1]?.focus(); }} className={`h-11 min-w-0 w-full max-w-10 rounded border bg-transparent text-center outline-none focus:ring-2 focus:ring-[#b39126]/30 ${error ? "border-red-500" : "border-neutral-400"}`} />)}</div></fieldset><p id="reset-code-error" role="alert" className="mt-2 text-xs text-red-600">{error}</p><p role="timer" className="mt-4 text-xs">Code expires in {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</p><p className="mt-3 text-xs">Didn't receive the code? <button type="button" disabled={busy || cooldown > 0} onClick={() => submit(null, true)} className="font-semibold underline disabled:opacity-50">{cooldown ? `Resend in ${cooldown}s` : "Resend code"}</button></p></>}
            {step === 3 && <>{[{ key: "password", label: "New password", value: password, update: setPassword, error: passwordError }, { key: "confirmation", label: "Confirm password", value: confirmation, update: setConfirmation, error: confirmationError }].map((field) => <div key={field.key} className="mt-4"><label htmlFor={`reset-${field.key}`} className="text-xs text-neutral-600">{field.label}</label><div className={`mt-2 flex items-center gap-2 rounded border bg-white pl-3 pr-1 focus-within:ring-2 focus-within:ring-[#b39126]/20 ${field.error ? "border-red-500" : "border-neutral-200"}`}><LockKeyhole size={14} className="text-neutral-400" /><input id={`reset-${field.key}`} type={visible[field.key] ? "text" : "password"} autoComplete="new-password" disabled={busy} value={field.value} onChange={(event) => { field.update(event.target.value); setError(""); }} onBlur={() => setTouched((previous) => ({ ...previous, [field.key]: true }))} aria-invalid={!!field.error} aria-describedby={`reset-${field.key}-error`} placeholder={field.label} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" /><button type="button" aria-label={`${visible[field.key] ? "Hide" : "Show"} ${field.label.toLowerCase()}`} aria-pressed={!!visible[field.key]} onClick={() => setVisible((previous) => ({ ...previous, [field.key]: !previous[field.key] }))} className="flex size-11 items-center justify-center text-neutral-400">{visible[field.key] ? <EyeOff size={16} /> : <Eye size={16} />}</button></div><p id={`reset-${field.key}-error`} role="alert" className="mt-1 text-xs text-red-600">{field.error}</p>{field.key === "password" && <p className="mt-1 text-xs text-neutral-500">Use at least 8 characters.</p>}</div>)}{confirmation && password === confirmation && <p className="mt-2 flex items-center gap-1 text-xs text-green-700"><Check size={13} /> Passwords match</p>}{error && <p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}</>}
            <div className="mt-7 flex justify-end"><button disabled={busy} type="submit" className={`${button} w-full sm:w-64`}>{busy ? "Please wait..." : step === 1 ? "Continue" : step === 2 ? "Verify code" : "Reset password"}</button></div>
          </form>
          {step === 1 ? <p className="mt-3 text-right text-xs">Remember your password? <Link href="/auth/sign-in" className="underline">Log in</Link></p> : step === 2 && <button disabled={busy} onClick={changeEmail} className="mt-4 min-h-10 w-full border border-neutral-300 text-xs">Change email address</button>}
        </div>
      </div>
    </section>
    {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"><section role="dialog" aria-modal="true" aria-labelledby="reset-dialog-title" className="w-full max-w-sm rounded-lg bg-white p-7 text-center shadow-xl"><span className="mx-auto flex size-12 items-center justify-center rounded-full bg-green-100 text-green-600"><Check /></span><h2 id="reset-dialog-title" className="mt-4 text-xl font-semibold">{modal === "success" ? "Password reset successful!" : "Code sent!"}</h2><p role="status" className="mt-2 text-sm text-neutral-600">{modal === "success" ? "password schanged succesffuly" : "Your verification code has been sent to your email."}</p>{modal === "success" && <p className="mt-2 text-xs text-neutral-500">Redirecting to buyer sign in...</p>}<button autoFocus className={`${button} mt-5 w-full`} onClick={() => { if (modal === "success") router.replace("/auth/sign-in"); else { setModal(""); inputs.current[0]?.focus(); } }}>{modal === "success" ? "Login" : "Continue to verification"}</button></section></div>}
  </main>;
}
