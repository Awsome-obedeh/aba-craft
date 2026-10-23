"use client"
import { api } from '@/app/lib/axios';
import { useAuthStore } from '@/app/store/authStore';
import DashboardLayout from '@/components/layout/DashboardLayout';
import BusinessApprovalCard from '@/components/vendor/BusinessApprovalCard';
import VendorApprovalCard from '@/components/vendor/VendorApprovalCard'

import React, { use, useEffect, useState } from 'react'
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

export default function SingleVendorPage({params}) {
// server way to use useParams
  const router = useRouter();
  const { user, accessToken } = useAuthStore();

  const [vendor, setVendor]=useState({})
  const [business, setBusiness]=useState({})
  const [loading, setLoading]=useState(true);
  const [verification, setVerification] = useState(null);
  const [verificationChecked, setVerificationChecked] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verificationReload, setVerificationReload] = useState(0);


  useEffect(() => {
    if (!accessToken && !user) {
      router.push('/auth/sign-in');
    }


  }, [user, accessToken, router]);

  const role = user?.role;
  const email = user?.email;
    const {id}= use(params)

    useEffect(() => {
      let isActive = true;

      const loadVerification = async () => {
        try {
          const res = await api.get(`/admin/vendors/verification/${id}`);
          if (!isActive) return;
          setVerification(res.data.verification);
          setAdminNotes(res.data.verification?.adminNotes || '');
        } catch (error) {
          // A vendor that has not submitted a verification record yet has no
          // document to show. That is an empty state, not a failure.
          if (!isActive) return;
          if (error.response?.status === 404) {
            setVerification(null);
            setAdminNotes('');
            return;
          }
          console.error('Error fetching verification:', error);
          toast.error(error.response?.data?.message || 'Failed to fetch verification');
        } finally {
          if (isActive) setVerificationChecked(true);
        }
      };

      const loadVendorInfo = async () => {
        try {
          const res = await api.get(`/vendor/profile/${id}`);
          if (isActive) {
            setVendor(res.data.formattedResponse.vendorInfo || {});
            setBusiness(res.data.formattedResponse.businessInfo || {});
          }
        } catch (error) {
          if (isActive) {
            console.error("ERROR", error.message);
            toast.error(error.response?.data?.message || "Error fetching Vendor information.");
          }
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      void loadVendorInfo();
      void loadVerification();
      return () => {
        isActive = false;
      };
    }, [id, verificationReload]);

    const handleDecision = async (action) => {
      if (!id) return;
      const url = `/admin/vendors/verification/${id}/decision`;
      try {
        setSubmitting(true);
        const res = await api.post(url, { action, adminNotes });
        toast.success(res.data.message || 'Updated');
        setVerificationReload((n) => n + 1);
      } catch (error) {
        console.error('Error updating verification:', error);
        toast.error(error.response?.data?.message || 'Failed to update');
      } finally {
        setSubmitting(false);
      }
    };

  return (

    <DashboardLayout role={role} email={email}>

    <div className="flex justify-center flex-col gap-6 items-center w-full">
      <VendorApprovalCard loading={loading} vendor={vendor} id={id} onReject={() => {
        if (!verification) {
          toast.error('This vendor has no verification record to reject. Use the vendor list to suspend the account.');
          return;
        }
        handleDecision('rejected');
      }}/>
      {/* <BusinessApprovalCard loading={loading} business={business}/> */}

      {verificationChecked && !verification && <div className="w-full max-w-5xl bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
        <p className="text-sm font-semibold text-slate-900">No verification record submitted</p>
        <p className="mt-2 text-sm text-slate-500">
          This vendor has not submitted BVN, ABSSIN, business address or a CAC certificate yet.
          Use the approve control above to verify the vendor manually, or wait for a submission.
        </p>
      </div>}

      {verification && <div className="w-full max-w-5xl bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Verification record</p>
            <p className="text-xs text-slate-500 break-all">Owner ID: {id}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${
            verification?.status === 'verified'
              ? 'bg-green-500 text-white'
              : verification?.status === 'rejected'
                ? 'bg-rose-500 text-white'
                : 'bg-amber-500 text-white'
          }`}>
            {verification?.status || 'pending'}
          </span>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-semibold text-slate-800">BVN</label>
                {verification?.bvn && <button
                  type="button"
                  disabled={submitting}
                  onClick={async () => {
                    try {
                      setSubmitting(true);
                      const res = await api.post('/admin/vendors/verification/verify-bvn', { ownerId: id });
                      if (res.data?.success) {
                        toast.success(res.data?.message || 'BVN verification completed');
                        setVerificationReload((n) => n + 1);
                      } else {
                        toast.error(res.data?.message || 'BVN verification failed');
                      }
                    } catch (error) {
                      toast.error(error?.response?.data?.message || error?.message || 'Error verifying BVN');
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-black text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {submitting ? 'Verifying...' : 'Verify BVN'}
                </button>}
              </div>
              <div className="mt-2 text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{verification.bvn || '-'}</div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-800">ABSSIN</label>
              <div className="mt-2 text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{verification.abssin || '-'}</div>
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
              <div className="mt-2 text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{verification.businessAddress || '-'}</div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-800">CAC Certificate Number</label>
              <div className="mt-2 text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{verification.cacCertificateNumber || '-'}</div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-800">CAC Certificate</label>
              <div className="mt-2">
                {verification.cacDocumentUrl ? <>
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
                </> : <div className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3">Not uploaded</div>}
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
      </div>}
    </div>
    </DashboardLayout>
  )
}
