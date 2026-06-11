'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { MetricCard } from '@/components/MetricCard';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/app/store/authStore';
import { api } from '@/app/lib/axios';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { FiSearch } from 'react-icons/fi';

export default function AdminDashboardPage() {
  const [vendors, setVendors] = useState([]);
  const [activeTab, setActiveTab] = useState('All Vendors');
  const [selectedIds, setSelectedIds] = useState([]);
  const [totalVendors, setTotalVendors] = useState(0);
  const [pendingVendors, setPendingVendors] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('joinedDate');
  const [sortOrder, setSortOrder] = useState('desc');

  const { user, accessToken } = useAuthStore();
  const router = useRouter();

  const role = user?.role;
  const email = user?.email;
  const userName = user?.name || user?.businessName || 'Admin User';

  // Fetch vendors data
  const fetchVendors = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/vendors');
      setVendors(res.data.vendors || []);
      setTotalVendors(res.data.totalVendors || 0);
      setPendingVendors(res.data.pendingVendors || 0);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      if (error.response) {
        toast.error(error.response.data.message || 'Failed to fetch vendors');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken && !user) {
      router.push('/auth/sign-in');
      return;
    }

    (async () => {
      await fetchVendors();
    })();
  }, [user, accessToken, router]);

  const getBadgeClass = (status) => {
    const normalized = status?.toLowerCase() || '';
    if (normalized === 'approved') return 'bg-green-500 text-white';
    if (normalized === 'under_review') return 'bg-amber-500 text-white';
    return 'bg-red-500 text-white';
  };

  const getFilteredTabStatus = (tab) => {
    if (tab === 'All Vendors') return null;
    if (tab === 'Pending Verification') return 'pending';
    if (tab === 'Verified') return 'approved';
    if (tab === 'Suspended') return 'suspended';
    return null;
  };

  // Filter logic based on the top pills and search
  const filteredVendors = vendors.filter(vendor => {
    const filterStatus = getFilteredTabStatus(activeTab);
    if (filterStatus && vendor.status?.toLowerCase() !== filterStatus) {
      return false;
    }
    if (searchQuery && !vendor.name?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Sort vendors
  const sortedVendors = useMemo(() => {
    return [...filteredVendors].sort((a, b) => {
      if (sortOrder === 'asc') {
        return a[sortBy] > b[sortBy] ? 1 : -1;
      } else {
        return a[sortBy] < b[sortBy] ? 1 : -1;
      }
    });
  }, [filteredVendors, sortBy, sortOrder]);

  // Handle individual row selection
  const handleToggleSelectRow = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Handle master select all checkbox
  const handleToggleSelectAll = () => {
    if (selectedIds.length === sortedVendors.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedVendors.map(v => v.id));
    }
  };



  return (

    <DashboardLayout role={role}>
      <div className="min-h-screen bg-slate-50/60 p-6 md:p-10 pb-32 font-sans">

        {/* Upper Context Header */}
        <div className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 2a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5zm0 4a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
                <p className="text-sm text-slate-500">Overview of vendor management and platform analytics</p>
              </div>
            </div>
          </div>

          {/* User profile identifier */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-800">{userName}</p>
              <p className="text-xs text-slate-400 capitalize">{role}</p>
            </div>
            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100" className="w-9 h-9 rounded-full object-cover border-2 border-white" alt="" />
          </div>
        </div>

        {/* Grid Row: Metric Cards */}
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
             <MetricCard
               key="total-active"
               title="Total Active vendors"
               value={totalVendors || ''}
               subtext="Updated just now"
               icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 2a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5zm0 4a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5z" /></svg>}
             />
            <MetricCard
              key="pending-verifications"
              title="Pending Verifications"
              value={pendingVendors || ''}
              subtext="Needs your attention"
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 100-18 9 9 0 000 18z" /></svg>}
            />
             <MetricCard
               key="verified-vendors"
               title="Verified Vendors"
               value={totalVendors - pendingVendors}
               subtext="Approved & active"
               trend={totalVendors > 0 ? `${Math.round(((totalVendors - pendingVendors) / totalVendors) * 100)}%` : "0%"}
               isTrendPositive={true}
               icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7 20h10a2 2 0 002-2V6a2 2 0 002-2H7a2 2 0 002-2v12a2 2 0 002 2z" /></svg>}
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
                  ? 'bg-gradient-to-r from-indigo-500 to-emerald-500 text-white shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 w-48"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">📊</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                >
                  <option value="joinedDate">Joined Date</option>
                  <option value="name">Vendor Name</option>
                  <option value="totalProducts">Total Products</option>
                  <option value="status">Status</option>
                </select>
              </div>
              
              <button className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl shadow-sm transition-all">
                <span>📤</span> Export
              </button>
            </div>
          </div>
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
                      checked={sortedVendors.length > 0 && selectedIds.length === sortedVendors.length}
                      onChange={handleToggleSelectAll}
                    />
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => {
                    setSortBy(sortBy === 'name' ? 'name' : 'name');
                    setSortOrder(sortBy === 'name' && sortOrder === 'asc' ? 'desc' : 'asc');
                  }}>
                    Vendor name
                    <span className="ml-1">{sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</span>
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => {
                    setSortBy(sortBy === 'status' ? 'status' : 'status');
                    setSortOrder(sortBy === 'status' && sortOrder === 'asc' ? 'desc' : 'asc');
                  }}>
                    Verification status
                    <span className="ml-1">{sortBy === 'status' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</span>
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => {
                    setSortBy(sortBy === 'totalProducts' ? 'totalProducts' : 'totalProducts');
                    setSortOrder(sortBy === 'totalProducts' && sortOrder === 'asc' ? 'desc' : 'asc');
                  }}>
                    Total product
                    <span className="ml-1">{sortBy === 'totalProducts' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</span>
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => {
                    setSortBy(sortBy === 'joinedDate' ? 'joinedDate' : 'joinedDate');
                    setSortOrder(sortBy === 'joinedDate' && sortOrder === 'asc' ? 'desc' : 'asc');
                  }}>
                    Joined Date
                    <span className="ml-1">{sortBy === 'joinedDate' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</span>
                  </th>
                  <th className="p-4 text-center">Quick Action</th>
                </tr>
              </thead>
              {loading ? (
          <tbody>
            <tr>
              <td colSpan="6" className="p-20 text-center text-slate-500">Loading vendors...</td>
            </tr>
          </tbody>
        ) : filteredVendors.length === 0 ? (
          <tbody>
            <tr>
              <td colSpan="6" className="p-20 text-center text-slate-500">No vendors found.</td>
            </tr>
          </tbody>
        ) : (
          <tbody className="divide-y divide-slate-100">
            {sortedVendors.map((vendor, idx) => {
              const isSelected = selectedIds.includes(vendor.id);
              return (
                <tr
                  key={vendor.id}
                  className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-slate-50/50' : ''} border-b`}
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
                      <img src={vendor.avatar} alt={vendor.name} className="w-8 h-8 rounded-full object-cover border-2 border-white" />
                      <div>
                        <p className="font-medium text-slate-800">{vendor.name}</p>
                        <p className="text-xs text-slate-400">{vendor.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center ${getBadgeClass(vendor.status)} gap-1.5 px-3 py-1 text-xs font-medium rounded-full`}>
                      {vendor.status}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-slate-600">{vendor.totalProducts}</td>
                  <td className="p-4 text-slate-500 text-xs">{vendor.joinedDate}</td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button 
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors hover:scale-105"
                        title="View Details"
                      >
                        ➔
                      </button>
                      <button 
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors hover:scale-105"
                        title="Edit Vendor"
                      >
                        ✏️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        )}
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
              <button 
                onClick={() => {
                  // Handle verify selected vendors
                  toast.success(`${selectedIds.length} vendor(s) verified successfully`);
                  setSelectedIds([]);
                }}
                className="px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all transform hover:-translate-y-0.5"
              >
                ✓ Verify selected
              </button>
              <button 
                onClick={() => {
                  // Handle suspend selected vendors
                  toast.success(`${selectedIds.length} vendor(s) suspended successfully`);
                  setSelectedIds([]);
                }}
                className="px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-all transform hover:-translate-y-0.5"
              >
                ⊘ Suspend selected
              </button>
              <button 
                onClick={() => {
                  // Handle send notice to selected vendors
                  toast.success(`Notice sent to ${selectedIds.length} vendor(s)`);
                  setSelectedIds([]);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-emerald-500 hover:bg-gradient-to-br from-indigo-600 to-emerald-600 rounded-xl shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5"
              >
                🚀 Send notice
              </button>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}