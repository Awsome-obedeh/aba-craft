'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { Camera, CreditCard, LockKeyhole, LogOut, Save, Store, UserRound } from 'lucide-react';
import { api } from '@/app/lib/axios';
import { logout } from '@/app/lib/logout';
import { useAuthStore } from '@/app/store/authStore';
import { personalChanges, businessChanges, validatePassword } from '@/app/lib/accountValidation';
import { Input } from '@/components/ui/Input';
import { FormSection } from '@/components/ui/FormSection';
import { Avatar, Notice, primaryButton, secondaryButton } from './AccountUI';

const personalValues = user => ({ fullName: user.fullName || '', phoneNumber: user.phoneNumber || '', sex: user.sex || '' });
const businessKeys = ['businessName', 'businessDescription', 'businessType', 'country', 'state', 'lga', 'address', 'postalCode', 'landmark'];
const businessValues = business => Object.fromEntries(businessKeys.map(key => [key, business?.[key] || '']));
const bankValues = bank => Object.fromEntries(['bankName', 'accountName', 'accountNumber', 'accountType'].map(key => [key, bank?.[key] || '']));

function useFormFeedback() {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({});
  const lock = useRef(false);
  async function submit(action) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setFeedback({});
    try { await action(); setFeedback({ success: true, message: 'Your changes have been saved.' }); }
    catch (error) { setFeedback({ message: error.response?.data?.message || error.message || 'Could not save. Please try again.', fields: error.response?.data?.fields || error.fields || {} }); }
    finally { lock.current = false; setBusy(false); }
  }
  return { busy, feedback, submit, clear: () => setFeedback({}) };
}

function Actions({ busy, dirty, reset }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brandBorder pt-5"><p className="text-xs text-muted" aria-live="polite">{dirty ? 'You have unsaved changes' : 'All changes saved'}</p><div className="flex gap-2"><button type="button" className={secondaryButton} onClick={reset} disabled={busy || !dirty}>Cancel</button><button type="submit" className={primaryButton} disabled={busy || !dirty}><Save size={16} />{busy ? 'Saving…' : 'Save changes'}</button></div></div>;
}

export default function AccountSettings({ data, onSaved }) {
  const vendor = data.user.role === 'vendor';
  const links = [['personal', 'Personal details', UserRound], ...(vendor ? [['business', 'Business details', Store], ['bank', 'Bank details', CreditCard]] : []), ['security', 'Security', LockKeyhole]];
  return <div className="grid items-start gap-6 lg:grid-cols-[220px_1fr]">
    <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto rounded-2xl border border-brandBorder bg-white p-2 lg:sticky lg:top-24 lg:flex-col">{links.map(([id, title, Icon]) => <a key={id} href={`#${id}`} className="flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-forest transition hover:bg-cream focus-visible:outline-2 focus-visible:outline-clay"><Icon size={17} />{title}</a>)}</nav>
    <div className="min-w-0 space-y-7">
      <section id="personal" className="scroll-mt-28"><FormSection title="Personal details" subtitle="Let us know how to reach you."><PhotoForm user={data.user} onSaved={onSaved} /><PersonalForm user={data.user} onSaved={onSaved} /></FormSection></section>
      {vendor && <><section id="business" className="scroll-mt-28"><FormSection title="Business details" subtitle="Tell the story behind your craft.">{data.businessError ? <Notice message={data.businessError} /> : <BusinessForm business={data.business} onSaved={onSaved} />}</FormSection></section><section id="bank" className="scroll-mt-28"><FormSection title="Bank details" subtitle="Private account information. Visible only in your settings.">{data.businessError ? <Notice message={data.businessError} /> : !data.business ? <p className="rounded-xl bg-cream p-4 text-sm text-muted">Save your business details above to add your bank account.</p> : <BankForm />}</FormSection></section></>}
      <section id="security" className="scroll-mt-28"><FormSection title="Security" subtitle="A strong password helps keep your account yours."><PasswordForm /><SignOut /></FormSection></section>
    </div>
  </div>;
}

function PhotoForm({ user, onSaved }) {
  const form = useFormFeedback();
  const input = useRef(null);
  function upload(event) {
    const photo = event.target.files?.[0];
    event.target.value = '';
    if (!photo) return;
    form.submit(async () => {
      if (!['image/jpeg', 'image/png'].includes(photo.type) || photo.size > 2 * 1024 * 1024) throw new Error('Choose a JPEG or PNG photo smaller than 2 MB.');
      const payload = new FormData(); payload.append('photo', photo);
      const res = await api.post('/account/avatar', payload);
      onSaved(res.data.user);
    });
  }
  return <div className="space-y-4 border-b border-brandBorder pb-6"><div className="flex flex-wrap items-center gap-5"><Avatar user={user} size={80} /><div><div className="flex flex-wrap gap-2"><input ref={input} type="file" accept="image/jpeg,image/png" className="sr-only" tabIndex={-1} aria-label="Profile photo" onChange={upload} disabled={form.busy} /><button type="button" className={secondaryButton} onClick={() => input.current?.click()} disabled={form.busy}><Camera size={16} />{form.busy ? 'Updating…' : 'Change photo'}</button>{user.profilePicture && <button type="button" className="min-h-11 px-3 text-sm text-red-700 disabled:opacity-50" disabled={form.busy} onClick={() => form.submit(async () => { const res = await api.delete('/account/avatar'); onSaved(res.data.user); })}>Remove</button>}</div><p className="mt-2 text-xs text-muted">JPG or PNG, up to 2 MB. Photos save immediately.</p></div></div><Notice {...form.feedback} /></div>;
}

function PersonalForm({ user, onSaved }) {
  const [values, setValues] = useState(() => personalValues(user));
  const [saved, setSaved] = useState(() => personalValues(user));
  const form = useFormFeedback();
  const change = event => setValues(prev => ({ ...prev, [event.target.name]: event.target.value }));
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  return <form onSubmit={event => { event.preventDefault(); form.submit(async () => { const changes = personalChanges(values); const res = await api.patch('/account/profile', changes); const next = personalValues(res.data.user); setValues(next); setSaved(next); onSaved(res.data.user); }); }} noValidate className="space-y-5">
    <div className="grid gap-5 sm:grid-cols-2"><Input label="Full name" id="fullName" value={values.fullName} onChange={change} error={form.feedback.fields?.fullName} autoComplete="name" maxLength={100} required disabled={form.busy} /><Input label="Email address" id="email" value={user.email} readOnly autoComplete="email" /><Input label="Phone number" id="phoneNumber" value={values.phoneNumber} onChange={change} error={form.feedback.fields?.phoneNumber} type="tel" autoComplete="tel" maxLength={30} disabled={form.busy} /><div><label htmlFor="sex" className="mb-1.5 block text-xs font-medium text-gray-700">Sex (optional)</label><select id="sex" name="sex" value={values.sex} onChange={change} disabled={form.busy} className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"><option value="">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></div></div>
    <p className="text-xs text-muted">Your email is your sign-in identity and cannot be changed here.</p><Notice {...form.feedback} /><Actions busy={form.busy} dirty={dirty} reset={() => { setValues(saved); form.clear(); }} />
  </form>;
}

function BusinessForm({ business, onSaved }) {
  const [values, setValues] = useState(() => businessValues(business));
  const [saved, setSaved] = useState(() => businessValues(business));
  const form = useFormFeedback();
  const change = event => setValues(prev => ({ ...prev, [event.target.name]: event.target.value }));
  return <form noValidate className="space-y-5" onSubmit={event => { event.preventDefault(); form.submit(async () => { businessChanges(values); const res = await api.patch('/vendor/profile', { businessInfo: values }); const next = businessValues(res.data.data.business); setSaved(next); setValues(next); onSaved(res.data.data.updatedVendor, res.data.data.business); }); }}>
    <div className="grid gap-5 sm:grid-cols-2">{[['businessName', 'Business name', 150], ['businessType', 'Business type', 100]].map(([id, label, max]) => <Input key={id} label={label} id={id} value={values[id]} onChange={change} error={form.feedback.fields?.[id]} maxLength={max} disabled={form.busy} />)}</div>
    <div><label htmlFor="businessDescription" className="mb-1.5 block text-xs font-medium text-gray-700">Your business story</label><textarea id="businessDescription" name="businessDescription" rows={4} maxLength={2000} value={values.businessDescription} onChange={change} disabled={form.busy} className="w-full resize-y rounded-lg border border-gray-300 p-3 text-sm leading-6" placeholder="Share what you make and what makes it special." /></div>
    <div className="grid gap-5 sm:grid-cols-2">{[['country', 'Country', 80], ['state', 'State', 80], ['lga', 'Local government area', 100], ['address', 'Business address', 300], ['postalCode', 'Postal code', 20], ['landmark', 'Landmark', 200]].map(([id, label, max]) => <Input key={id} label={label} id={id} value={values[id]} onChange={change} error={form.feedback.fields?.[id]} maxLength={max} disabled={form.busy} />)}</div>
    <Notice {...form.feedback} /><Actions busy={form.busy} dirty={JSON.stringify(values) !== JSON.stringify(saved)} reset={() => { setValues(saved); form.clear(); }} />
  </form>;
}

function BankForm() {
  const [values, setValues] = useState(null);
  const [saved, setSaved] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const form = useFormFeedback();
  useEffect(() => {
    const controller = new AbortController();
    api.get('/vendor/profile?includeBank=true', { signal: controller.signal }).then(res => { const bank = bankValues(res.data.formattedResponse.businessInfo?.bankDetails); setValues(bank); setSaved(bank); setLoadError(''); }).catch(error => { if (!controller.signal.aborted) setLoadError(error.response?.data?.message || 'Unable to load bank details.'); });
    return () => controller.abort();
  }, [attempt]);
  if (loadError) return <div className="space-y-3"><Notice message={loadError} /><button className={secondaryButton} onClick={() => { setLoadError(''); setAttempt(value => value + 1); }}>Retry bank details</button></div>;
  if (!values) return <p role="status" className="text-sm text-muted">Loading bank details…</p>;
  return <form noValidate className="space-y-5" onSubmit={event => { event.preventDefault(); form.submit(async () => { businessChanges({ bankDetails: values }); await api.patch('/vendor/profile', { businessInfo: { bankDetails: values } }); setSaved({ ...values }); }); }}>
    <div className="grid gap-5 sm:grid-cols-2">{[['bankName', 'Bank name', 100], ['accountName', 'Account holder name', 150], ['accountNumber', 'Account number', 10], ['accountType', 'Account type', 40]].map(([id, label, max]) => <Input key={id} label={label} id={id} value={values[id]} onChange={event => setValues(prev => ({ ...prev, [id]: event.target.value }))} error={form.feedback.fields?.[id]} maxLength={max} inputMode={id === 'accountNumber' ? 'numeric' : 'text'} autoComplete="off" disabled={form.busy} />)}</div>
    <p className="text-xs leading-6 text-muted">Saving bank details does not initiate a payment or verify your bank account. Never enter your PIN or password.</p><Notice {...form.feedback} /><Actions busy={form.busy} dirty={JSON.stringify(values) !== JSON.stringify(saved)} reset={() => { setValues(saved); form.clear(); }} />
  </form>;
}

function PasswordForm() {
  const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [visible, setVisible] = useState(false);
  const form = useFormFeedback();
  const router = useRouter();
  const clearAuth = useAuthStore(state => state.clearAuth);
  return <form noValidate className="space-y-5" onSubmit={event => { event.preventDefault(); form.submit(async () => { validatePassword(values); await api.post('/account/password', values); setValues({ currentPassword: '', newPassword: '', confirmPassword: '' }); toast.success('Password changed. Please sign in again.'); clearAuth(); router.replace('/auth/sign-in?passwordChanged=1'); }); }}>
    <div className="rounded-xl bg-cream p-4 text-sm leading-6 text-muted">Use at least 8 characters with uppercase, lowercase, a number, and one of @$!%*?&. Changing your password signs you out on all devices.</div>
    <div className="grid gap-5 sm:grid-cols-2">{[['currentPassword', 'Current password'], ['newPassword', 'New password'], ['confirmPassword', 'Confirm new password']].map(([id, label]) => <Input key={id} label={label} id={id} value={values[id]} onChange={event => setValues(prev => ({ ...prev, [id]: event.target.value }))} error={form.feedback.fields?.[id]} type={visible ? 'text' : 'password'} autoComplete={id === 'currentPassword' ? 'current-password' : 'new-password'} disabled={form.busy} />)}</div>
    <label className="flex w-fit items-center gap-2 text-sm text-muted"><input type="checkbox" checked={visible} onChange={event => setVisible(event.target.checked)} className="h-4 w-4 accent-forest" />Show passwords</label><Notice {...form.feedback} /><button className={primaryButton} disabled={form.busy}><LockKeyhole size={16} />{form.busy ? 'Updating password…' : 'Update password'}</button>
  </form>;
}

function SignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-brandBorder pt-6"><div><h3 className="text-sm font-semibold">Sign out of this device</h3><p className="mt-1 text-xs text-muted">You can sign back in whenever you need.</p></div><button className={secondaryButton} disabled={busy} onClick={async () => { setBusy(true); await logout(router); }}><LogOut size={16} />{busy ? 'Signing out…' : 'Sign out'}</button></div>;
}
