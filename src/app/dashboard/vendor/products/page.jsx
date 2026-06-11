'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { formatPrice } from '@/utils/priceFormater';
import ProductsFilterControl from '@/components/ProductsFilterControl';
import Link from 'next/link';
import ProductPagination from '@/components/ProductPagination';
import { api } from '@/app/lib/axios';
import { useAuthStore } from '@/app/store/authStore';
import DashboardLayout from "@/components/layout/DashboardLayout";

// Vendor-only "My Products" view — pulls from the same /api/products
// endpoint with ?scope=mine so a vendor sees their own catalog (including
// under-review and rejected items), as opposed to the storefront view at
// /dashboard/products which only shows published/approved items.
export default function VendorMyProductsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [category, setCategory] = useState(searchParams.get('category') || '');
    const [brand, setBrand] = useState(searchParams.get('brand') || '');
    const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
    const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
    const [hasDiscount, setHasDiscount] = useState(searchParams.get('hasDiscount') === 'true');
    const [hasPercentageDiscount, setHasPercentageDiscount] = useState(searchParams.get('hasPercentageDiscount') === 'true');
    const { user, accessToken } = useAuthStore();

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams(searchParams.toString());
            params.set("scope", "mine");
            const res = await api.get(`/products?${params.toString()}`);
            setProducts(res.data.data);
            setPagination(res.data.pagination);
        } catch (err) {
            console.error("Failed parsing vendor catalog payload", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!accessToken && !user) {
            router.push('/auth/sign-in');
            return;
        }
        if (user && user.role !== "vendor" && user.role !== "admin") {
            router.replace("/dashboard/products");
            return;
        }
        (async () => {
            await fetchProducts();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, accessToken, user]);

    const updateURL = (newChanges = {}) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(newChanges).forEach(([key, value]) => {
            if (value === null || value === '' || value === false) {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });
        router.push(`/dashboard/vendor/products?${params.toString()}`);
    };

    const handleApplyFilters = (e) => {
        e.preventDefault();
        updateURL({ search, category, brand, minPrice, maxPrice, hasDiscount, hasPercentageDiscount, page: 1 });
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            updateURL({ page: newPage });
        }
    };

    const handleClearFilters = () => {
        setSearch('');
        setCategory('');
        setBrand('');
        setMinPrice('');
        setMaxPrice('');
        setHasDiscount(false);
        setHasPercentageDiscount(false);
        router.push('/dashboard/vendor/products');
    };

    const role = user?.role;
    const email = user?.email;

    return (
        <DashboardLayout role={role} email={email}>
            <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white antialiased">
                <header className="border-b border-black py-6 px-6 md:px-12 flex justify-between items-baseline">
                    <div>
                        <h1 className="text-xl font-bold">My Products</h1>
                        <p className="text-xs text-gray-500 mt-1">All products you have uploaded, including those still under review.</p>
                    </div>
                    <p className="text-md uppercase text-black">{pagination.totalItems} Total</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[calc(100vh-81px)]">
                    <ProductsFilterControl
                        handleApplyFilters={handleApplyFilters}
                        handleClearFilters={handleClearFilters}
                        search={search}
                        setSearch={setSearch}
                        category={category}
                        setCategory={setCategory}
                        brand={brand}
                        setBrand={setBrand}
                        minPrice={minPrice}
                        setMinPrice={setMinPrice}
                        maxPrice={maxPrice}
                        setMaxPrice={setMaxPrice}
                        hasDiscount={hasDiscount}
                        setHasDiscount={setHasDiscount}
                        hasPercentageDiscount={hasPercentageDiscount}
                        setHasPercentageDiscount={setHasPercentageDiscount}
                    />
                    <div className="lg:col-span-3 flex flex-col justify-between">
                        {loading ? (
                            <div className="flex-1 flex items-center justify-center font-mono text-xs uppercase tracking-widest text-neutral-400 animate-pulse">Loading Products...</div>
                        ) : products.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center font-mono text-xs uppercase tracking-widest text-neutral-400">No products yet. Upload your first product to get started.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 border-b border-black">
                                {products.map((product) => (
                                    <Link key={product._id} href={`/dashboard/products/${product.slug}`} className="border-b md:border-b-0 md:border-r border-black p-6 flex flex-col justify-between hover:bg-neutral-50 group transition-colors duration-300 min-h-[380px]">
                                        <div>
                                            <div className="relative w-full aspect-4/3 bg-neutral-100 flex items-center justify-center border border-neutral-200 group-hover:border-black transition-colors duration-300">
                                                <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">Product Image</span>
                                            </div>
                                            <span className="text-[10px] font-bold tracking-widest uppercase text-neutral-400 font-mono mt-4 block">{product.brand}</span>
                                            <p className="font-thin text-lg leading-tight capitalize tracking-tight mt-1 group-hover:underline">{product.productName}</p>
                                        </div>

                                        <div className="mt-8 space-y-2 font-mono">
                                            <div className="flex items-baseline gap-2">
                                                {product.discountPrice > 0 ? (
                                                    <>
                                                        <span className="text-base font-black text-black">{formatPrice(product.discountPrice)}</span>
                                                        <span className="text-xs text-neutral-500 line-through">{formatPrice(product.price)}</span>
                                                    </>
                                                ) : product.discountPercentage > 0 ? (
                                                    <>
                                                        <p className="text-base font-black text-black">{formatPrice((product.discountPercentage / 100) * product.price)}</p>
                                                        <span className="text-xs text-neutral-500 line-through">{formatPrice(product.price)}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-base font-black text-black">{formatPrice(product.price)}</span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-neutral-500">Stock: {product.quantity ?? "—"}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                        <ProductPagination pagination={pagination} handlePageChange={handlePageChange} />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
