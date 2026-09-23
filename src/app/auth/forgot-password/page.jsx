"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!showConfirmation) return;
    closeButtonRef.current?.focus();
    function onKeyDown(event) {
      if (event.key === "Escape") setShowConfirmation(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showConfirmation]);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (response.ok) {
        setShowConfirmation(true);
      } else {
        setMessage(data.message || "Unable to send the reset link. Please try again.");
      }
    } catch {
      setMessage("Unable to send the reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-12">
    <form onSubmit={submit} className="relative w-full max-w-md space-y-5 overflow-hidden rounded-3xl border border-brandBorder bg-white px-6 py-9 shadow-brand-lg sm:px-10 sm:py-11">
      <div className="absolute inset-x-0 top-0 h-1 bg-gold" aria-hidden="true" />
      <h1 className="font-serif text-3xl font-semibold text-forest">Forgot your password?</h1>
      <p className="text-gray-600">Enter your account email and we’ll send a reset link.</p>
      <label className="block text-sm font-medium" htmlFor="email">Email</label>
      <input id="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded-xl border border-brandBorder bg-cream/40 p-3 outline-none focus:border-gold focus:ring-2 focus:ring-gold/20" />
      <button disabled={loading} className="button-bg w-full rounded-md p-3 font-medium text-dark transition-opacity hover:opacity-90 disabled:opacity-50">{loading ? "Sending..." : "Send reset link"}</button>
      {message && <p role="status" className="text-sm">{message}</p>}
      <Link href="/auth/sign-in" className="block text-center text-sm font-medium text-forest underline underline-offset-4">Back to sign in</Link>
    </form>
    {showConfirmation && <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/45 px-4 py-8" onMouseDown={event => { if (event.target === event.currentTarget) setShowConfirmation(false); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="reset-sent-title" aria-describedby="reset-sent-description" className="w-full max-w-sm rounded-2xl border border-brandBorder bg-white px-7 py-8 text-center shadow-[0_24px_70px_rgba(18,20,19,0.24)] sm:px-9">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
          <Check size={26} strokeWidth={2.5} aria-hidden="true" />
        </div>
        <h2 id="reset-sent-title" className="mt-5 font-serif text-2xl font-semibold text-forest">Reset Link Sent!</h2>
        <p id="reset-sent-description" className="mt-2 text-sm leading-6 text-gray-600">If an account exists for that email, you’ll receive a password reset link shortly. Check your inbox.</p>
        <button ref={closeButtonRef} type="button" onClick={() => setShowConfirmation(false)} className="button-bg mt-6 w-full rounded-lg px-4 py-3 font-medium text-dark transition-opacity hover:opacity-90">Got it</button>
      </div>
    </div>}
  </main>;
}
