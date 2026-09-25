'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Settings2, ShieldCheck, Store, UserRound } from 'lucide-react';
import { api } from '@/app/lib/axios';
import { useAuthStore } from '@/app/store/authStore';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FormSection } from '@/components/ui/FormSection';
import { Avatar, Notice, Details, AccountSkeleton, primaryButton, secondaryButton } from './AccountUI';
import AccountSettings from './AccountSettings';
import VerificationTable from '@/components/Verification';

export default function AccountPage({ settings = false }) {
  const user = useAuthStore(state => state.user);
  const updateUser = useAuthStore(state => state.updateUser);
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) { router.replace('/auth/sign-in'); return; }
    const controller = new AbortController();
    api.get('/account/profile', { signal: controller.signal }).then(res => {
      setData(res.data);
      setError('');
      updateUser(res.data.user);
    }).catch(err => {
      if (!controller.signal.aborted) setError(err.response?.data?.message || 'We could not load your account. Please try again.');
    });
    return () => controller.abort();
  }, [userId, attempt, router, updateUser]);

  function updateAccount(savedUser, business) {
    if (savedUser) updateUser(savedUser);
    setData(prev => ({ ...prev, user: savedUser || prev.user, business: business === undefined ? prev.business : business }));
  }

  if (!user) return <AccountSkeleton />;
  return <DashboardLayout role={user.role} email={user.email}>
    <div className="account-surface mx-auto max-w-6xl space-y-7 pb-10">
      {error ? <div className="space-y-4"><Notice message={error} /><button className={secondaryButton} onClick={() => { setError(''); setAttempt(value => value + 1); }}>Try again</button></div> : !data ? <AccountSkeleton /> : <>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-clay">Your AbaCraft account</p><h1 className="text-3xl font-semibold tracking-tight text-forest sm:text-4xl">{settings ? 'Account settings' : 'My profile'}</h1><p className="mt-2 text-sm text-muted">{settings ? 'The details that make this space yours.' : 'A little about you. A place for everything that matters.'}</p></div>
          <Link href={settings ? '/dashboard/profile' : '/dashboard/settings'} className={secondaryButton}>{settings ? <UserRound size={16} /> : <Settings2 size={16} />}{settings ? 'View profile' : 'Edit profile'}<ArrowUpRight size={15} /></Link>
        </div>
        {settings ? <AccountSettings data={data} onSaved={updateAccount} /> : <ProfileOverview data={data} />}
      </>}
    </div>
  </DashboardLayout>;
}

function ProfileOverview({ data }) {
  const { user, business, businessError } = data;
  const joined = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'Date unavailable';
  const vendor = user.role === 'vendor';
  return <>
    <section className="relative overflow-hidden rounded-3xl bg-forest p-6 text-white shadow-brand-lg sm:p-9">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-28 h-80 w-80 rounded-full border-[45px] border-white/5" />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
        <Avatar user={user} size={96} />
        <div className="min-w-0 flex-1"><p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#dfc57f]">Made of community</p><h2 className="break-words text-2xl font-semibold sm:text-3xl">{user.fullName || 'Welcome to AbaCraft'}</h2><p className="mt-2 break-all text-sm text-white/70">{user.email}</p><span className="mt-4 inline-flex rounded-full border border-white/20 px-3 py-1 text-xs capitalize">{user.role} account</span></div>
        <div className="border-t border-white/15 pt-5 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0"><p className="text-xs text-white/60">Part of AbaCraft since</p><p className="mt-1 text-lg font-medium">{joined}</p><p className="mt-3 flex items-center gap-1.5 text-xs text-[#dfc57f]"><ShieldCheck size={15} />{user.emailVerified ? 'Email verified' : 'Email not verified'}</p></div>
      </div>
    </section>
    <div className="grid items-start gap-6 lg:grid-cols-[1.45fr_1fr]">
      <div className="space-y-6"><FormSection title="Personal details" subtitle="Your account information, all in one place."><Details items={[["Full name", user.fullName], ["Email address", user.email], ["Phone number", user.phoneNumber], ["Sex", user.sex]]} /></FormSection>
        {vendor && <FormSection title="Your business" subtitle="The craft and the people behind it.">{businessError ? <Notice message={businessError} /> : business ? <><p className="text-xl font-semibold text-forest">{business.businessName}</p><p className="text-sm leading-7 text-muted">{business.businessDescription || 'Add a description to tell your business story.'}</p><Details items={[["Business type", business.businessType], ["Location", [business.lga, business.state, business.country].filter(Boolean).join(', ')], ["Business address", business.address]]} /></> : <div className="rounded-xl bg-cream p-5"><Store size={24} className="mb-3 text-clay" /><p className="font-medium">Give your craft a home.</p><p className="mb-4 mt-2 text-sm text-muted">Add your business name, story, and location to complete your vendor profile.</p><Link href="/dashboard/settings#business" className={primaryButton}>Add business details<ArrowUpRight size={15} /></Link></div>}</FormSection>}
      </div>
      <div className="space-y-6"><VerificationTable user={user} business={business} businessError={businessError} />
      <div className="rounded-2xl border border-[#e7dcc5] bg-[#f5efdf] p-6"><ShieldCheck className="mb-3 text-forest" size={24} /><h2 className="font-semibold text-forest">Your account, in your hands</h2><p className="mb-4 mt-2 text-sm leading-6 text-muted">Keep your contact details current and your password private.</p><Link href="/dashboard/settings#security" className="inline-flex items-center gap-2 text-sm font-semibold text-forest">Manage account security<ArrowUpRight size={16} /></Link></div></div>
    </div>
  </>;
}
