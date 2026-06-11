"use client";
import { api } from '@/app/lib/axios';
import { formatPrice } from '@/utils/priceFormater';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { useAuthStore } from '@/app/store/authStore';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useRouter } from 'next/navigation';
import { FiSearch } from 'react-icons/fi';
import { RejectProductModal } from '@/components/RejectProductModal';

export default function AdminPendingProducts() {

  const { user, accessToken } = useAuthStore();
  const router = useRouter();

  const role = user?.role;
  const email = user?.email;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionModal, setRejectionModal] = useState({ show: false, productId: null, slug: null, productName: '' });

  // Fetch pending products
  useEffect(() => {
    if (!accessToken && !user) {
      router.push('/auth/sign-in');
      return;
    }

    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await api.get('/products/admin/pending');
        if (res.status === 200 || res.status === 201) {
          setProducts(res.data.products || []);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error("Error fetching pending products");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [user, accessToken, router]);

  // Group products by vendor dynamically
  const groupedProducts = products.reduce((acc, product) => {
    const vendor = product.vendorName;
    if (!acc[vendor]) {
      acc[vendor] = [];
    }
    acc[vendor].push(product);
    return acc;
  }, {});

  // Filter products by search query
  const filteredProducts = products.filter(product =>
    product.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.vendorName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Regroup filtered products
  const filteredGroupedProducts = filteredProducts.reduce((acc, product) => {
    const vendor = product.vendorName;
    if (!acc[vendor]) {
      acc[vendor] = [];
    }
    acc[vendor].push(product);
    return acc;
  }, {});

  const handleRejectClick = (productId, slug, productName) => {
    setRejectionModal({ show: true, productId, slug, productName });
  };

  const handleRejectConfirm = async (rejectionReason) => {
    try {
      setIsProcessing(true);
      await api.put(`/products/admin/reject/${rejectionModal.slug}`, { rejectionReason });
      setProducts(prev => prev.filter(p => p.id !== rejectionModal.productId));
      toast.success('Product rejected successfully');
      setRejectionModal({ show: false, productId: null, slug: null, productName: '' });
    } catch (error) {
      console.error('Error rejecting product:', error);
      toast.error('Failed to reject product');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async (productId, slug) => {
    try {
      setIsProcessing(true);
      await api.put(`/products/admin/approve/${slug}`);
      setProducts(prev => prev.filter(p => p.id !== productId));
      toast.success('Product approved successfully');
    } catch (error) {
      console.error('Error approving product:', error);
      toast.error('Failed to approve product');
    } finally {
      setIsProcessing(false);
    }
  };

  return (

    <DashboardLayout role={role} email={email}>
      <div className="min-h-screen bg-slate-50/50 p-6 sm:p-10 font-sans">
        {/* Header section */}
        <div className="mb-10 max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pending Publications</h1>
          <p className="text-sm text-slate-500 mt-1">Review and approve product listings submitted by your vendors.</p>
        </div>

        {/* Search Bar */}
        <div className="max-w-7xl mx-auto mb-6">
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products, vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>

        <div className="max-w-7xl mx-auto space-y-12">
          {loading ? (
            <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-400 font-medium">Loading pending products...</p>
            </div>
          ) : Object.keys(filteredGroupedProducts).length === 0 ? (
            <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-400 font-medium">All caught up! No pending products to review.</p>
            </div>
          ) : (
            // Loop through each vendor group
            Object.entries(filteredGroupedProducts).map(([vendorName, vendorProducts]) => (
              <section key={vendorName} className="space-y-4">

                {/* Vendor Row Header */}
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
                  <h2 className="text-lg font-semibold text-slate-800 tracking-tight">
                    {vendorName}
                    <span className="ml-2 text-xs font-normal bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                      {vendorProducts.length} pending
                    </span>
                  </h2>
                </div>

                {/* Responsive horizontal grid row for this vendor's items */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {vendorProducts.map((product) => (
                    <div
                      key={product.id}
                      className="group bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col hover:shadow-[0_12px_30px_rgba(0,0,0,0.04)] transition-all duration-300"
                    >
                      {/* Product Image preview */}
                      <Link href={`/dashboard/products/${product.slug}`} className="relative aspect-video w-full bg-slate-100 overflow-hidden">
                        <img
                          src={product.productImages?.[0] || product.productImages}
                          alt={product.productName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2 right-2 bg-amber-500/90 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md backdrop-blur-sm">
                          Pending
                        </div>
                      </Link>

                      {/* Meta Body */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-semibold text-slate-800 text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors">
                            {product.productName}
                          </h4>
                          <p className="text-base font-bold text-slate-900 mt-1">
                            {formatPrice(product.price)}
                          </p>
                        </div>

                        {/* Action Triggers */}
                        <div className="grid grid-cols-2 gap-2 mt-4">
                          <button
                            onClick={() => handleRejectClick(product.id, product.slug, product.productName)}
                            disabled={isProcessing}
                            className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-100 transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/products/${product.slug}`)}  
                            className="px-3 py-2 text-xs font-semibold text-white bg-black hover:bg-black/70 rounded-xl shadow-sm transition-all"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

      </div>

      <RejectProductModal
        isOpen={rejectionModal.show}
        onClose={() => setRejectionModal({ show: false, productId: null, slug: null, productName: '' })}
        onConfirm={handleRejectConfirm}
        productName={rejectionModal.productName}
        loading={isProcessing}
      />
    </DashboardLayout>
  );
}