import { FormSection } from './ui/FormSection';
import { StatusBadge } from './account/AccountUI';

export default function VerificationTable({ user, business, businessError }) {
  return <FormSection title="Account verification" subtitle="Your current status, directly from AbaCraft.">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brandBorder pb-4"><span className="text-sm">Email address</span><StatusBadge status={user?.emailVerified ? 'verified' : 'pending'} /></div>
    {user?.role === 'vendor' && <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brandBorder pb-4"><span className="text-sm">Identity</span><StatusBadge status={user.verificationStatus} /></div>
      <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm">Business</span>{business ? <StatusBadge status={business.verificationStatus} /> : <span className="text-xs text-muted">{businessError ? 'Unavailable' : 'Not submitted'}</span>}</div>
      <p className="pt-2 text-xs leading-6 text-muted">Verification is reviewed by the AbaCraft team. Your saved details do not automatically grant verified status.</p>
    </>}
  </FormSection>;
}
