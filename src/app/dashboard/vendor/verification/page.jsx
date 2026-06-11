'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/app/store/authStore';
import { api } from '@/app/lib/axios';
import { toast } from 'react-toastify';

function sanitizeDigits(v) {
  if (typeof v !== 'string') return '';
  return v.replace(/\s+/g, '');
}

export default function VendorVerificationPage() {
  const { user, accessToken } = useAuthStore();
  const role = user?.role;

  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState(null);

  const [bvn, setBvn] = useState('');
  const [abssin, setAbssin] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [cacCertificateNumber, setCACCertificateNumber] = useState('');

  const [cacFile, setCACFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await api.get('/vendor/verification');
        setVerification(res.data.verification);

        if (res.data.verification) {
          setBvn(res.data.verification.bvn || '');
          setAbssin(res.data.verification.abssin || '');
          setBusinessAddress(res.data.verification.businessAddress || '');
          setCACCertificateNumber(res.data.verification.cacCertificateNumber || '');
        }
      } catch (error) {
        if (error?.response) toast.error(error.response.data?.message || 'Failed to load verification');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const isApproved = verification?.status === 'verified';
  const isRejected = verification?.status === 'rejected';
  const isPending = verification?.status === 'pending' || verification?.status === 'in_progress';

  const onSubmit = async (e) => {
    e.preventDefault();
    if (isApproved && !isRejected) {
      toast.info('Your verification has already been approved.');
      return;
    }

    setSubmitting(true);
    try {
      // Upload CAC file first if provided
      let cacDocumentUrl = verification?.cacDocumentUrl;
      if (cacFile) {
        const fd = new FormData();
        fd.append('file', cacFile);
        const up = await api.post('/vendor/verification/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        cacDocumentUrl = up.data.url;
      }

      if (!cacDocumentUrl) {
        toast.error('CAC certificate upload is required.');
        setSubmitting(false);
        return;
      }

      const payload = {
        bvn: sanitizeDigits(bvn),
        abssin: sanitizeDigits(abssin),
        businessAddress,
        cacCertificateNumber,
        cacDocumentUrl,
      };

      const res = await api.post('/vendor/verification', payload);
      toast.success(res.data.message || 'Submitted for admin review.');

      // Refresh verification
      const refreshed = await api.get('/vendor/verification');
      setVerification(refreshed.data.verification);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role={role}>
        <div className="min-h-screen bg-slate-50/60 p-6 md:p-10 pb-32 font-sans">
          <div className="text-slate-600">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={role}>
      <div className="min-h-screen bg-slate-50/60 p-6 md:p-10 pb-32 font-sans">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Vendor Verification</h1>
          <p className="text-slate-600 text-sm mb-6">
            Submit your BVN, ABSSIN, store/business address, and CAC certificate for admin approval.
          </p>

          {verification && (
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Status</p>
                  <p className="text-sm text-slate-600">{verification.status}</p>
                </div>
                {verification?.cacDocumentUrl && (
                  <a
                    href={verification.cacDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs px-3 py-2 rounded-xl bg-slate-900 text-white"
                  >
                    View CAC
                  </a>
                )}
              </div>
            </div>
          )}

          {isApproved && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-emerald-800 font-semibold text-sm">Approved — you can now upload and sell products.</p>
            </div>
          )}

          <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">BVN (11 digits)</label>
                <input
                  value={bvn}
                  onChange={(e) => setBvn(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="e.g. 12345678901"
                  disabled={isApproved && !isRejected}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">ABSSIN (11 digits)</label>
                <input
                  value={abssin}
                  onChange={(e) => setAbssin(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="e.g. 09876543210"
                  disabled={isApproved && !isRejected}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-2">Store/Business Address</label>
                <input
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Enter full address"
                  disabled={isApproved && !isRejected}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-2">CAC Certificate Number</label>
                <input
                  value={cacCertificateNumber}
                  onChange={(e) => setCACCertificateNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Enter CAC certificate number"
                  disabled={isApproved && !isRejected}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-2">Upload CAC Certificate (Image/PDF)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setCACFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm bg-white"
                  disabled={isApproved && !isRejected}
                />
                {verification?.cacDocumentUrl && !cacFile && (
                  <p className="text-xs text-slate-500 mt-2">Existing document is already uploaded. Upload a new file to replace it.</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting || (isApproved && !isRejected)}
                className="px-5 py-3 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit for approval'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setBvn('');
                  setAbssin('');
                  setBusinessAddress('');
                  setCACCertificateNumber('');
                  setCACFile(null);
                }}
                disabled={submitting || (isApproved && !isRejected)}
                className="px-5 py-3 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Clear
              </button>
            </div>

            {isPending && (
              <p className="text-xs text-slate-500 mt-4">
                Your verification is pending admin review. You cannot use the app to upload or sell products until verified.
              </p>
            )}
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

