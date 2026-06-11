'use client';

import React, { useEffect, useState } from 'react';
import { MetricCard } from '@/components/MetricCard';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/app/store/authStore';
import { api } from '@/app/lib/axios';
import { toast } from 'react-toastify';
const INITIAL_VENDORS = [
  { id: '1', name: 'Royal leather works', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', status: 'pending', totalProducts: 0, joinedDate: 'May 16, 2026' },
  { id: '2', name: 'Elegant leather', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', status: 'pending', totalProducts: 125, joinedDate: 'Feb 12, 2026' },
  { id: '3', name: 'Kings Concept leather', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', status: 'pending', totalProducts: 0, joinedDate: 'Apr 16, 2026' },
  { id: '4', name: 'Eites crafts & sons', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', status: 'pending', totalProducts: 0, joinedDate: 'Jan 16, 2026' },
  { id: '5', name: 'Gifted hands leather', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', status: 'pending', totalProducts: 40, joinedDate: 'May 16, 2025' },
  { id: '6', name: 'Leather Artisans', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', status: 'pending', totalProducts: 14, joinedDate: 'May 16, 2025' },
];

export default function AdminDashboardPage() {
  const [vendors, setVendors] = useState(INITIAL_VENDORS);
  const [activeTab, setActiveTab] = useState('All Vendors');
  const [selectedIds, setSelectedIds] = useState([]);
  const [totalVendors, setTotalVendors] = useState(0);
  const [pendingVendors, setPendingVendors] = useState(0);

  const { user, accessToken } = useAuthStore();


  useEffect(() => {
    if (!accessToken && !user) {
      router.push('/auth/sign-in');
    }


  }, [user, accessToken]);

  const role = user?.role;
  const email = user?.email;
  const getDashboardData = async () => {
    try {
      const res = await api.get('/admin/vendors');
      setVendors(res.data.vendors);
      setTotalVendors(res.data.totalVendors);
      setPendingVendors(res.data.pendingVendors);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      if (error.response) {
        toast.error(error.response.data.message || 'Failed to fetch vendors');
      }
    }
  };

  useEffect(() => {
    // Avoid calling a state-updating async function directly in the effect body.
    // React lint expects the state changes to happen in an async callback.
    const run = async () => {
      await getDashboardData();
    };

    run();
  }, []);
  console.log("Vendors data:", vendors);


  // Filter logic based on the top pills
  const filteredVendors = vendors.filter(vendor => {
    if (activeTab === 'All Vendors') return true;
    return vendor.status.toLowerCase() === activeTab.toLowerCase();
  });

  // Handle individual row selection
  const handleToggleSelectRow = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Handle master select all checkbox
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredVendors.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredVendors.map(v => v.id));
    }
  };



  return (

    <DashboardLayout role={role}>
      <div className="min-h-screen bg-slate-50/60 p-6 md:p-10 pb-32 font-sans">

        {/* Upper Context Header */}
        <div className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>

          {/* User profile identifier mock */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-800">Sandra Ejiofor</p>
              <p className="text-xs text-slate-400">Vendor</p>
            </div>
            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100" className="w-9 h-9 rounded-full object-cover" alt="" />
          </div>
        </div>

        {/* Grid Row: Metric Cards */}
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <MetricCard
              key="total-active"
              title="Total Active vendors"
              value={totalVendors || ''}
              subtext="Updated just now"
              trend="+18% from last month"
              isTrendPositive={true}
            />
            <MetricCard
              key="pending-verifications"
              title="Pending Verifications"
              value={pendingVendors || ''}
              subtext="Needs your attention"
            />
        </div>

        {/* Control Area: Filtering Tabs & Export */}
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex flex-wrap gap-2.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/40">
            {['All Vendors', 'Pending Verification', 'Verified', 'Suspended'].map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedIds([]); }}
                className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-200 ${activeTab === tab
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl shadow-sm transition-all">
            <span>📤</span> Export
          </button>
        </div>

        {/* Main Core View: Vendor Table */}
        <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500/30 accent-slate-900 cursor-pointer"
                      checked={filteredVendors.length > 0 && selectedIds.length === filteredVendors.length}
                      onChange={handleToggleSelectAll}
                    />
                  </th>
                  <th className="p-4">Vendor name</th>
                  <th className="p-4">Verification status</th>
                  <th className="p-4">Total product</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4 text-center">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredVendors.map((vendor, idx) => {
                  const isSelected = selectedIds.includes(vendor.id);
                  return (
                    <tr
                      key={vendor.id}
                      className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-slate-50/50' : ''}`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500/30 accent-slate-900 cursor-pointer"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(vendor.id)}
                        />
                      </td>
                      <td className="p-4 font-medium text-slate-800">
                        <div className="flex items-center gap-3">
                          <img src={vendor.avatar} alt="" className="w-7 h-7 rounded-full object-cover border border-slate-100" />
                          <span>{vendor.name}</span>
                        </div>
                      </td>
                      <td className="p-4 ">
                        <style className={`inline-flex items-center ${vendor.status === 'approved' ? 'badge-approved' : vendor.status === 'under_review' ? 'badge-review' : 'badge-banned'} gap-1.5 px-3 py-1 text-xs font-medium border rounded-full `}>
                          {vendor.status}
                        </style>
                      </td>
                      <td className="p-4 font-medium text-slate-600">{vendor.totalProducts}</td>
                      <td className="p-4 text-slate-500 text-xs">{vendor.joinedDate}</td>
                      <td className="p-4 text-center">
                        <button className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors">
                          ➔
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Floating Bottom Bulk Operations Action Bar */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-slate-200/80 px-6 py-3.5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] flex items-center gap-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <p className="text-xs font-bold text-slate-800 border-r border-slate-200 pr-4">
              {selectedIds.length} {selectedIds.length === 1 ? 'Vendor' : 'Vendors'} selected
            </p>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all">
                ✓ Verify selected
              </button>
              <button className="px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                ⊘ Suspend selected
              </button>
              <button className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-all flex items-center gap-1.5">
                🚀 Send notice
              </button>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}