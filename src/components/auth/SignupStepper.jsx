"use client";
import Link from "next/link";
import { Check, ShieldCheck } from "lucide-react";
const steps = [
  ["Create account", "Your email and password"],
  ["Verify account", "Confirm your email"],
  ["Select role", "Find your place"],
  ["Business information", "Introduce your business"],
  ["Verify identity", "Documents and verification"],
];
export default function SignupStepper({ currentStep }) {
  return (
    <aside className="signup-stepper hidden w-[280px] shrink-0 flex-col border-r border-brandBorder bg-white p-8 text-brandText md:flex">
      <Link href="/" className="font-serif text-3xl font-semibold">Aba Crafts<span className="text-gold">.</span></Link>
      <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-muted">Made by hand. Built with pride.</p>
      <div className="my-10 h-px bg-brandBorder" />
      <p className="mb-6 text-[10px] uppercase tracking-[0.2em] text-muted">Your artisan journey</p>
      <ol className="space-y-6">
        {steps.map(([title, subtitle], index) => {
          const active = currentStep === index + 1;
          const completed = currentStep > index + 1;
          return (
            <li key={title} aria-current={active ? "step" : undefined} className="flex items-start gap-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs ${active ? "border-gold bg-gold text-dark" : completed ? "border-gold/40 bg-cream text-[#80651F]" : "border-brandBorder bg-white text-muted"}`}>
                {completed ? <Check size={16} /> : index + 1}
              </span>
              <div className="pt-0.5">
                <p className={`text-sm font-medium ${active || completed ? "text-brandText" : "text-muted"}`}>{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{subtitle}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-auto pt-12">
        <ShieldCheck size={22} className="mb-3 text-gold" />
        <p className="text-sm text-brandText">Craft deserves a trusted home.</p>
        <p className="mt-2 text-xs leading-relaxed text-muted">Verification helps build confidence in your business and our community.</p>
      </div>
    </aside>
  );
}
