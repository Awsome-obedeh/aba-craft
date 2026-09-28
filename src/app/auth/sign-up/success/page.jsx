"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSignup } from "@/app/context/SignupContext";

export default function SignupSuccessPage() {
  const { resetSignup } = useSignup();
  useEffect(() => resetSignup(), [resetSignup]);
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#222] px-4">
      <section className="max-w-lg rounded-lg bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold">Registration submitted</h1>
        <p className="my-4">Your account and business details have been received.</p>
        <Link href="/auth/sign-in" className="inline-block rounded bg-[#bd9627] px-6 py-3 text-white">Continue to sign in</Link>
      </section>
    </main>
  );
}
