"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, Check, CircleHelp, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { completeBuyerSignup, signupError } from "@/app/lib/signup";
import { buyerPasswordError, buyerConfirmationError } from "@/app/lib/buyer-validation";
import { toast } from "react-toastify";

export default function BuyerPassword({ email, initialPassword = "", verificationToken, onBack, onComplete }) {
  const router = useRouter();
  const [password, setPassword] = useState(initialPassword);
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState({ password: false, confirmation: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState({});
  const pending = useRef(false);
  const valid = password.length >= 8 && new TextEncoder().encode(password).length <= 72;
  const matches = confirmation.length > 0 && password === confirmation;
  const fieldErrors = {
    password: touched.password ? buyerPasswordError(password) : "",
    confirmation: touched.confirmation ? buyerConfirmationError(password, confirmation) : "",
  };

  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    setTouched({ password: true, confirmation: true });
    if (!valid || !matches) {
      document.getElementById(!valid ? "buyer-password" : "buyer-confirmation")?.focus();
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await completeBuyerSignup({ email, verificationToken, password, confirmPassword: confirmation });
      sessionStorage.removeItem("buyerSignup");
      setPassword("");
      setConfirmation("");
      onComplete?.();
      setSuccess(true);
      toast.success("Your buyer account is ready. Sign in to continue.");
      router.replace("/auth/sign-in");
    } catch (error) {
      setError(signupError(error));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center bg-[#282522] px-4 py-10 text-neutral-900">
      <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/singup-bg.jpg')" }} />
      <div aria-hidden="true" className="absolute inset-0 bg-black/60" />
      <section aria-labelledby="buyer-password-title" className="relative w-full max-w-[820px] rounded-xl bg-[#f5f5f5] px-6 pb-12 pt-5 shadow-2xl sm:px-8 sm:pb-14">
        <div className="flex items-center justify-between">
          <button type="button" disabled={busy || success} onClick={onBack} className="inline-flex min-h-9 items-center gap-2 rounded border border-neutral-300 bg-white px-3 text-xs disabled:opacity-50"><ArrowLeft size={13} /> Back</button>
          <button type="button" aria-expanded={help} aria-controls="password-help" onClick={() => setHelp(!help)} className="inline-flex min-h-9 items-center gap-2 text-xs"><CircleHelp size={13} /> Need help?</button>
        </div>
        {help && <p id="password-help" className="mt-4 rounded border border-neutral-200 bg-white p-3 text-sm">Choose a unique password with at least 8 characters. After creating your account, sign in with your email and new password.</p>}
        <h1 id="buyer-password-title" className="mt-5 text-2xl font-semibold tracking-tight">{success ? "Your buyer account is ready" : "Create a new password"}</h1>
        {success ? <div role="status" className="mt-5"><Check className="text-green-600" /><p className="mt-3 text-sm text-neutral-600">Your account has been created successfully. Sign in to start shopping.</p><Link href="/auth/sign-in" className="mt-7 inline-flex min-h-10 items-center justify-center rounded bg-[#b39126] px-10 text-sm font-medium text-white hover:bg-[#9b7c1d]">Continue to sign in</Link></div> : <>
          <p className="mt-1 text-sm text-neutral-600">Choose a strong password you haven&apos;t used before.</p>
          <form noValidate onSubmit={submit} aria-busy={busy} className="mt-5">
            {[{ key: "password", label: "New password", value: password, update: setPassword, placeholder: "Enter new password" }, { key: "confirmation", label: "Confirm password", value: confirmation, update: setConfirmation, placeholder: "Re-enter your new password" }].map((field) => <div key={field.key} className="mt-4">
              <label htmlFor={`buyer-${field.key}`} className="text-xs text-neutral-600">{field.label}</label>
              <div className={`mt-1.5 flex items-center gap-2 rounded-md border ${fieldErrors[field.key] ? "border-red-500" : "border-neutral-200"} bg-white pl-3 pr-1 focus-within:border-[#b39126] focus-within:ring-2 focus-within:ring-[#b39126]/20`}>
                <LockKeyhole size={14} aria-hidden="true" className="shrink-0 text-neutral-400" />
                <input id={`buyer-${field.key}`} type={visible[field.key] ? "text" : "password"} autoComplete="new-password" required minLength={8} disabled={busy} value={field.value} onBlur={() => setTouched((previous) => ({ ...previous, [field.key]: true }))} onChange={(event) => { field.update(event.target.value); setError(""); }} placeholder={field.placeholder} aria-describedby={fieldErrors[field.key] ? `buyer-${field.key}-error` : field.key === "password" ? "buyer-password-rules" : "buyer-password-match"} aria-invalid={!!fieldErrors[field.key]} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" />
                <button type="button" aria-label={`${visible[field.key] ? "Hide" : "Show"} ${field.label.toLowerCase()}`} aria-pressed={!!visible[field.key]} onClick={() => setVisible((previous) => ({ ...previous, [field.key]: !previous[field.key] }))} className="flex size-11 shrink-0 items-center justify-center text-neutral-400 hover:text-neutral-800">{visible[field.key] ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              {fieldErrors[field.key] && <p id={`buyer-${field.key}-error`} role="alert" className="mt-1 text-xs text-red-600">{fieldErrors[field.key]}</p>}
              {field.key === "password" && <p id="buyer-password-rules" className="mt-1 text-xs text-neutral-600">Use at least 8 characters.</p>}
            </div>)}
            <p id="buyer-password-match" aria-live="polite" className={`mt-2 flex items-center gap-1 text-xs ${matches ? "text-green-700" : "text-neutral-600"}`}>{matches ? <><Check size={13} /> Passwords match</> : "Re-enter your password to confirm it."}</p>
            {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
            <div className="mt-10 flex justify-end"><button type="submit" disabled={busy} className="min-h-10 w-full rounded bg-[#b39126] px-8 text-sm font-medium text-white hover:bg-[#9b7c1d] disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-600 sm:w-64">{busy ? "Creating account..." : "Create password"}</button></div>
          </form>
        </>}
      </section>
    </main>
  );
}
