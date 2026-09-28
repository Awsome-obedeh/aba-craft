"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";

function ResetForm() {
  const token = useSearchParams().get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const loginLinkRef = useRef(null);

  useEffect(() => {
    if (!showSuccessModal) return;
    loginLinkRef.current?.focus();
    function onKeyDown(event) {
      if (event.key === "Escape") setShowSuccessModal(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showSuccessModal]);

  async function submit(event) {
    event.preventDefault();
    if (password !== confirm) return setMessage("Passwords do not match.");
    if (new TextEncoder().encode(password).length > 72) return setMessage("Password must be at most 72 bytes.");
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const data = await response.json();
      if (response.ok) {
        setDone(true);
        setShowSuccessModal(true);
      } else {
        setMessage(data.message || "Unable to reset your password.");
      }
    } catch {
      setMessage("Unable to reset your password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-12">
    <form onSubmit={submit} className="relative w-full max-w-md space-y-5 overflow-hidden rounded-3xl border border-brandBorder bg-white px-6 py-9 shadow-brand-lg sm:px-10 sm:py-11">
      <div className="absolute inset-x-0 top-0 h-1 bg-gold" aria-hidden="true" />
      <h1 className="font-serif text-3xl font-semibold text-forest">Reset your password</h1>
      {!token && <p role="alert">This reset link is invalid. Request a new one.</p>}
      {token && !done && <>
        <label className="block text-sm font-medium" htmlFor="password">New password</label>
        <div className="relative">
          <input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-xl border border-brandBorder bg-cream/40 p-3 pr-12 outline-none focus:border-gold focus:ring-2 focus:ring-gold/20" />
          <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide new password" : "Show new password"} aria-pressed={showPassword} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-600 hover:text-black">
            {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
          </button>
        </div>
        <label className="block text-sm font-medium" htmlFor="confirm">Confirm new password</label>
        <div className="relative">
          <input id="confirm" type={showConfirm ? "text" : "password"} autoComplete="new-password" minLength={8} required value={confirm} onChange={event => setConfirm(event.target.value)} className="w-full rounded-xl border border-brandBorder bg-cream/40 p-3 pr-12 outline-none focus:border-gold focus:ring-2 focus:ring-gold/20" />
          <button type="button" onClick={() => setShowConfirm(value => !value)} aria-label={showConfirm ? "Hide confirmed password" : "Show confirmed password"} aria-pressed={showConfirm} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-600 hover:text-black">
            {showConfirm ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
          </button>
        </div>
        <button disabled={loading} className="button-bg w-full rounded-md p-3 font-medium text-dark transition-opacity hover:opacity-90 disabled:opacity-50">{loading ? "Updating..." : "Update password"}</button>
      </>}
      {done && <p role="status" className="text-sm text-gray-600">Your password has been updated. You can now sign in.</p>}
      {message && <p role="status" className="text-md text-red-700">{message}</p>}
      <Link href={done ? "/auth/sign-in" : "/auth/forgot-password"} className="block text-center text-sm font-medium text-forest underline underline-offset-4">{done ? "Sign in" : "Request a new link"}</Link>
    </form>
    {showSuccessModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/45 px-4 py-8" onMouseDown={event => { if (event.target === event.currentTarget) setShowSuccessModal(false); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="reset-success-title" aria-describedby="reset-success-description" className="w-full max-w-sm rounded-2xl border border-brandBorder bg-white px-7 py-8 text-center shadow-[0_24px_70px_rgba(18,20,19,0.24)] sm:px-9">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
          <Check size={26} strokeWidth={2.5} aria-hidden="true" />
        </div>
        <h2 id="reset-success-title" className="mt-5 font-serif text-2xl font-semibold text-forest">Password reset successful!</h2>
        <p id="reset-success-description" className="mt-2 text-sm leading-6 text-gray-600">Your password has been successfully updated. You can now log in with your new password.</p>
        <Link ref={loginLinkRef} href="/auth/sign-in" className="button-bg mt-6 block w-full rounded-lg px-4 py-3 font-medium text-dark transition-opacity hover:opacity-90">Login</Link>
      </div>
    </div>}
  </main>;
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>;
}
