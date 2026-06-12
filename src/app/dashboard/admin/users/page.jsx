'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/app/store/authStore';
import { api } from '@/app/lib/axios';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { FiSearch, FiUsers, FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function AdminUsersPage() {
  const { user, accessToken } = useAuthStore();
  const router = useRouter();

  const role = user?.role;
  const email = user?.email;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeTab, setActiveTab] = useState('All Users');

  // Fetch users data
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      setUsers(res.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error.response) {
        toast.error(error.response.data.message || 'Failed to fetch users');
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
      await fetchUsers();
    })();
  }, [user, accessToken, router]);

  // Filter users based on search and tab
  const filteredUsers = users.filter(user => {
    // Filter by tab
    if (activeTab !== 'All Users') {
      if (activeTab === 'Admins' && user.role !== 'admin') return false;
      if (activeTab === 'Vendors' && user.role !== 'vendor') return false;
      if (activeTab === 'Customers' && user.role !== 'customer') return false;
    }

    // Filter by search
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        user.name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.businessName?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Handle checkbox selection
  const handleToggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Handle select all
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredUsers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredUsers.map(u => u.id));
    }
  };

   // Handle delete user
   const handleDeleteUser = async (userId) => {
     try {
       if (!userId) return;

       // Backend only implements DELETE /admin/users (bulk via request body)
       await api.delete(`/admin/users`, { data: { ids: [userId] } });

       setUsers(prev => prev.filter(user => user.id !== userId));
       toast.success('User deleted successfully');
     } catch (error) {
       console.error('Error deleting user:', error);
       toast.error('Failed to delete user');
     }
   };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    try {
      await api.delete(`/admin/users`, { data: { ids: selectedIds } });
      setUsers(prev => prev.filter(user => !selectedIds.includes(user.id)));
      setSelectedIds([]);
      toast.success(`${selectedIds.length} user(s) deleted successfully`);
    } catch (error) {
      console.error('Error bulk deleting users:', error);
      toast.error('Failed to delete users');
    }
  };

  return (
    <DashboardLayout role={role}>
      <div className="min-h-screen bg-slate-50/60 p-6 md:p-10 pb-32 font-sans">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <FiUsers className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Management</h1>
                <p className="text-sm text-slate-500">Manage platform users and their roles</p>
              </div>
            </div>
          </div>

          {/* User profile */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-800">{user?.name || user?.businessName || 'Admin User'}</p>
              <p className="text-xs text-slate-400 capitalize">{role}</p>
            </div>
            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100" className="w-9 h-9 rounded-full object-cover border-2 border-white" alt="" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Total Users</h3>
            <p className="text-2xl font-bold text-slate-900">{users.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Admins</h3>
            <p className="text-2xl font-bold text-slate-900">{users.filter(u => u.role === 'admin').length}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Vendors</h3>
            <p className="text-2xl font-bold text-slate-900">{users.filter(u => u.role === 'vendor').length}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/40">
            {['All Users', 'Admins', 'Vendors', 'Customers'].map((tab) => (
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

          {/* Search and Actions */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 w-48"
              />
            </div>
            
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:bg-gradient-to-br from-rose-600 to-rose-700 rounded-xl shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5"
              >
                <FiTrash2 className="h-4 w-4 mr-2" /> Delete Selected
              </button>
            )}
          </div>
        </div>

        {/* Users Table */}
        <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500/30 accent-slate-900 cursor-pointer"
                      checked={filteredUsers.length > 0 && selectedIds.length === filteredUsers.length}
                      onChange={handleToggleSelectAll}
                    />
                  </th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Joined</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              {loading ? (
                <tbody>
                  <tr>
                    <td colSpan="7" className="p-20 text-center text-slate-500">Loading users...</td>
                  </tr>
                </tbody>
              ) : filteredUsers.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan="7" className="p-20 text-center text-slate-500">No users found.</td>
                  </tr>
                </tbody>
              ) : (
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    const isSelected = selectedIds.includes(user.id);
                    return (
                      <tr
                        key={user.id}
                        className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-slate-50/50' : ''} border-b`}
                      >
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500/30 accent-slate-900 cursor-pointer"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(user.id)}
                          />
                        </td>
                        <td className="p-4 font-medium text-slate-800">
                          <div className="flex items-center gap-3">
                            <img src={user.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'} alt={user.name} className="w-8 h-8 rounded-full object-cover border-2 border-white" />
                            <div>
                              <p className="font-medium text-slate-800">{user.name}</p>
                              {user.businessName && (
                                <p className="text-xs text-slate-400 italic">{user.businessName}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600">{user.email}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center ${user.role === 'admin' ? 'bg-blue-500 text-white' : user.role === 'vendor' ? 'bg-green-500 text-white' : 'bg-purple-500 text-white'} gap-1.5 px-3 py-1 text-xs font-medium rounded-full`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center ${user.isActive ? 'bg-green-500 text-white' : 'bg-red-500 text-white'} gap-1.5 px-3 py-1 text-xs font-medium rounded-full`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 text-xs">{user.joinedDate || 'N/A'}</td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button 
                              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors hover:scale-105"
                              title="View Details"
                            >
                              <FiEdit2 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors hover:scale-105"
                              title="Delete User"
                            >
                              <FiTrash2 className="h-4 w-4 text-red-500" />
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

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-slate-200/80 px-6 py-3.5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] flex items-center gap-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <p className="text-xs font-bold text-slate-800 border-r border-slate-200 pr-4">
              {selectedIds.length} {selectedIds.length === 1 ? 'User' : 'Users'} selected
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  // Placeholder for bulk actions
                  toast.info(`Bulk action on ${selectedIds.length} user(s)`);
                }}
                className="px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all transform hover:-translate-y-0.5"
              >
                ⚡ Actions
              </button>
              <button 
                onClick={handleBulkDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:bg-gradient-to-br from-rose-600 to-rose-700 rounded-xl shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5"
              >
                <FiTrash2 className="h-4 w-4 mr-2" /> Delete Selected
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}