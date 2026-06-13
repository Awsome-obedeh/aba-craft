"use client";
import { api } from '@/app/lib/axios';
import { formatPrice } from '@/utils/priceFormater';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { useAuthStore } from '@/app/store/authStore';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useRouter } from 'next/navigation';
// import { DeleteConfirmationModal } from './DeleteConfirmationModal'; // If you want to reuse your modal

// Sample Data mimicking an API response of pending items
const INITIAL_PENDING_PRODUCTS = [
  { id: 1, name: "Wireless Headphones Pro", price: 89.99, vendor: "TechNexus", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300" },
  { id: 2, name: "Mechanical Keyboard K8", price: 129.50, vendor: "TechNexus", image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300" },
  { id: 3, name: "Leather Minimalist Wallet", price: 45.00, vendor: "ApexCraft", image: "https://images.unsplash.com/photo-1627124793833-dd1ca9c3f094?w=300" },
  { id: 4, name: "Ergonomic Office Chair", price: 299.00, vendor: "ApexCraft", image: "https://images.unsplash.com/photo-1505816014357-96b5ff457e9a?w=300" },
  { id: 5, name: "4K UltraWide Monitor 34\"", price: 499.99, vendor: "FutureVision", image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=300" }
];

export default function AdminPendingProducts() {

  const { user, accessToken } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!accessToken && !user) {
      router.push('/auth/sign-in');
    }


  }, [user, accessToken]);

  const role = user?.role;
  const email = user?.email;
  const [products, setProducts] = useState();
  const [loading, setLoading] = useState(false);



  // get product
  const getVendorPendingProducts = async () => {
    const res = await api.get('/products/admin/pending');

    try {
      setLoading(true);

      if (res.status) {
        setLoading(true)
        setProducts(res.data.products);

      }
    }

    catch (error) {
      setLoading(false);
      toast.error("error fetching vendor's products");
    }
  };

  useEffect(() => {
    getVendorPendingProducts();
  }, []);

  //  Group products by vendor dynamically


  const groupedProducts = loading && products.length > 0 && products.reduce((acc, product) => {
    const vendor = product.vendorName;
    if (!acc[vendor]) {
      acc[vendor] = [];
    }
    acc[vendor].push(product);
    return acc;
  }, {});





  console.log("PENDING PRODUCTS", products, "GROUPED PRODUCTS: ", groupedProducts,);


  const handleReject = (productId) => {
    // API Call or open your modal here
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  return (

    <DashboardLayout role={role}>
      <div className="min-h-screen bg-slate-50/50 p-6 sm:p-10 font-sans">
        {/* Header section */}
        <div className="mb-10 max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pending Publications</h1>
          <p className="text-sm text-slate-500 mt-1">Review and approve product listings submitted by your vendors.</p>
        </div>

        <div className="max-w-7xl mx-auto space-y-12">
          {loading && Object.keys(groupedProducts).length === 0 ? (
            <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-400 font-medium">All caught up! No pending products to review.</p>
            </div>
          ) : (
            // 2. Loop through each vendor group
            Object.entries(groupedProducts).map(([vendorName, vendorProducts]) => (
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
                  {loading && vendorProducts.map((product) => (
                    <div
                      key={product.id}
                      className="group bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col hover:shadow-[0_12px_30px_rgba(0,0,0,0.04)] transition-all duration-300"
                    >
                      {/* Product Image preview */}
                      <Link href={`/dashboard/products/${product.slug}`} className="relative aspect-video w-full bg-slate-100 overflow-hidden">
                        <img
                          src={product.productImages[0]}
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
                          <div className="mt-8 flex items-baseline gap-2 font-mono">
                            {product.discountPrice > 0 ? (
                              <>
                                <span className="text-base font-black text-black">{formatPrice(product.discountPrice)}</span>
                                <span className="text-xs text-neutral-500 line-through">{formatPrice(product.price)}</span>
                              </>

                            ) : product.discountPercentage > 0 ? (
                              <>
                                <div className="flex flex-col items-baseline gap-2">

                                  <p className=" text-base font-black text-black">{formatPrice((product.discountPercentage / 100) * product.price)}</p>
                                  <span className="text-xs text-neutral-500 line-through">{formatPrice(product.price)}</span>
                                </div>

                                <span className="text-xs bg-green-200 p-2 rounded-sm text-green-600 font-bold ml-auto">{product.discountPercentage}% OFF</span>

                              </>
                            ) :
                              (<span className="text-base font-black text-black">{formatPrice(product.price)}</span>)


                            }



                          </div>
                        </div>

                        {/* Action Triggers */}
                        <div className="grid grid-cols-2 gap-2 mt-4">
                          <button
                            onClick={() => handleReject(product.id)}
                            className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-100 transition-colors"
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
    </DashboardLayout>
  );
}   