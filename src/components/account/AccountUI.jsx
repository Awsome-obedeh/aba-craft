'use client';

import Image from 'next/image';
import { Check, Clock3, ShieldCheck, AlertCircle } from 'lucide-react';

export function Avatar({ user, size = 80 }) {
  const initials = (user?.fullName || user?.email || 'A').split(/[\s@]+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <div className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#e9e3d5] font-semibold text-forest shadow-sm" style={{ width: size, height: size, fontSize: size / 3 }}>
    {user?.profilePicture ? <Image src={user.profilePicture} alt={`${user.fullName || 'Your'} profile photo`} fill sizes={`${size}px`} className="object-cover" unoptimized /> : <span aria-label="Profile initials">{initials}</span>}
  </div>;
}

export function StatusBadge({ status }) {
  const verified = status === 'verified';
  const rejected = status === 'rejected';
  const Icon = verified ? ShieldCheck : rejected ? AlertCircle : Clock3;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${verified ? 'bg-[#e8f1e9] text-[#285538]' : rejected ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}><Icon size={14} />{verified ? 'Verified' : rejected ? 'Needs attention' : 'Pending verification'}</span>;
}

export function Notice({ message, success = false }) {
  if (!message) return null;
  const Icon = success ? Check : AlertCircle;
  return <div role={success ? 'status' : 'alert'} className={`flex items-start gap-2 rounded-xl p-4 text-sm ${success ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-800'}`}><Icon size={18} className="mt-0.5 shrink-0" /><span>{message}</span></div>;
}

export function Details({ items }) {
  return <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">{items.map(([label, value]) => <div key={label} className="min-w-0"><dt className="mb-1 text-xs uppercase tracking-wider text-muted">{label}</dt><dd className="break-words text-sm font-medium text-brandText">{value || 'Not added yet'}</dd></div>)}</dl>;
}

export const primaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2d493c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-clay disabled:cursor-not-allowed disabled:opacity-50';
export const secondaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brandBorder bg-white px-4 py-2.5 text-sm font-medium text-brandText transition hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-clay disabled:opacity-50';

export function AccountSkeleton() {
  return <div role="status" aria-label="Loading account" className="mx-auto max-w-6xl space-y-6 motion-safe:animate-pulse"><div className="h-52 rounded-3xl bg-stone-200" /><div className="grid gap-6 md:grid-cols-2"><div className="h-72 rounded-2xl bg-white" /><div className="h-72 rounded-2xl bg-white" /></div><span className="sr-only">Loading account…</span></div>;
}
