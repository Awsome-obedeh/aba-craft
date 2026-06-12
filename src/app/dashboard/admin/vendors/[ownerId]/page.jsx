'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/app/store/authStore';
import { api } from '@/app/lib/axios';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

export default function VendorVerificationDetailsPage(props) {
  const params = React.use(props?.params);
  const { user, accessToken } = useAuthStore();
  const router = useRouter();

  const role = user?.role;

  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const ownerId = params?.ownerId;

  // Match backend validation: VendorVerification.ownerId is stored as an ObjectId.
  // If the dynamic param isn't provided or is nested, this will prevent 404s.
  // Note: backend route matches directly on the dynamic param.


  const fetchVerification = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/vendors/verification/${ownerId}`);
      setVerification(res.data.verification);
      setAdminNotes(res.data.verification?.adminNotes || '');
    } catch (error) {
      console.error('Error fetching verification:', error);
      if (error.response) {
        toast.error(error.response.data.message || 'Failed to fetch verification');
      }
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!accessToken && !user) {
        router.push('/auth/sign-in');
        return;
      }

      if (!ownerId) return;

      setLoading(true);
      try {
        const res = await api.get(`/admin/vendors/verification/${ownerId}`);
        if (cancelled) return;
        setVerification(res.data.verification);
        setAdminNotes(res.data.verification?.adminNotes || '');
      } catch (error) {
        console.error('Error fetching verification:', error);
        if (cancelled) return;
        if (error.response) {
          toast.error(error.response.data.message || 'Failed to fetch verification');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [accessToken, user, ownerId, router]);




  const handleDecision = async (action) => {
    if (!ownerId) return;

    const url = `/admin/vendors/verification/${ownerId}/decision`;

    try {
      setSubmitting(true);
      const res = await api.post(url, {
        action,
        adminNotes,
      });

      toast.success(res.data.message || 'Updated');
      await fetchVerification();
    } catch (error) {
      console.error('Error updating verification:', {
        url,
        ownerId,
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      });
      toast.error(error.response?.data?.message || 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout role={role}>
      <div className="min-h-screen bg-slate-50/60 p-6 md:p-10 pb-32 font-sans">
        <div className="max-w-4xl mx-auto mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Vendor Verification Details</h1>
          <p className="text-sm text-slate-500">Review BVN, ABSSIN, business address and CAC certificate</p>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Owner ID</p>
              <p className="text-xs text-slate-500 break-all">{ownerId}</p>
            </div>
            <div>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${
                  verification?.status === 'verified'
                    ? 'bg-green-500 text-white'
                    : verification?.status === 'rejected'
                      ? 'bg-rose-500 text-white'
                      : 'bg-amber-500 text-white'
                }`}
              >
                {verification?.status || 'pending'}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-500">Loading...</div>
          ) : !verification ? (
            <div className="p-10 text-center text-slate-500">Verification not found.</div>
          ) : (
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-semibold text-slate-800">BVN</label>
                  <div className="mt-2 text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{verification.bvn}</div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-800">ABSSIN</label>
                  <div className="mt-2 text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{verification.abssin}</div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-800">Business Name</label>
                  <div className="mt-2 text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{verification.businessName || '-'}</div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-800">Consent</label>
                  <div className="mt-2 text-sm text-slate-700 bg-slate-50 rounded-xl p-3">
                    {verification.isConsent === false ? 'No' : 'Yes'}
                  </div>
                </div>


                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-slate-800">Store/Business Address</label>
                  <div className="mt-2 text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{verification.businessAddress}</div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-800">CAC Certificate Number</label>
                  <div className="mt-2 text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{verification.cacCertificateNumber}</div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-800">CAC Certificate</label>
                  <div className="mt-2">
                    <a
                      href={verification.cacDocumentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm font-semibold"
                    >
                      View document
                      <span className="text-xs">↗</span>
                    </a>
                    <div className="text-xs text-slate-500 mt-2 break-all">{verification.cacDocumentUrl}</div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className="text-sm font-semibold text-slate-800">Admin Notes</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-2 w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
                  rows={4}
                  placeholder="Optional notes for approval/rejection"
                />
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  disabled={submitting}
                  onClick={() => handleDecision('verified')}
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 text-white hover:opacity-95 disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Verify Vendor'}
                </button>

                <button
                  disabled={submitting}
                  onClick={() => handleDecision('rejected')}
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Reject Vendor'}
                </button>

                <button
                  disabled={submitting}
                  onClick={() => router.push('/dashboard/admin')}
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

