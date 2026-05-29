// src/app/products/page.js
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';



import { formatPrice } from '@/utils/priceFormater';
import ProductsFilterControl from '@/components/ProductsFilterControl';
import Image from 'next/image';
import Link from 'next/link';
import ProductPagination from '@/components/ProductPagination';
import { api } from '@/app/lib/axios';

export default function ProductsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Application state wrappers
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });
    const [loading, setLoading] = useState(true);

    // Filter control local states
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [category, setCategory] = useState(searchParams.get('category') || '');
    const [brand, setBrand] = useState(searchParams.get('brand') || '');
    const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
    const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
    const [hasDiscount, setHasDiscount] = useState(searchParams.get('hasDiscount') === 'true');
    const [hasPercentageDiscount, setHasPercentageDiscount] = useState(searchParams.get('hasPercentageDiscount') === 'true');

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/products?${searchParams.toString()}`);
                setProducts(res.data.data);
                setPagination(res.data.pagination);
            } catch (err) {
                console.error("Failed parsing catalog payload", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [searchParams]);

    // Consolidates existing parameters and pushes a modified URL query 
    const updateURL = (newChanges = {}) => {
        const params = new URLSearchParams(searchParams.toString());

        // Merge or wipe values based on user configuration input
        Object.entries(newChanges).forEach(([key, value]) => {
            if (value === null || value === '' || value === false) {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });

        router.push(`/dashboard/products?${params.toString()}`);
    };

    const handleApplyFilters = (e) => {
        e.preventDefault();
        // Reset to page 1 whenever search filters are modified
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
        router.push('/dashboard/products');
    };

    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white antialiased">
            {/* Minimalist Top Nav Header Area */}
            <header className="border-b border-black py-6 px-6 md:px-12 flex justify-between items-baseline">
                <h1 className="text-2xl font-black uppercase tracking-tighter">ARCHIVE STUDIO</h1>
                <p className="text-xs  uppercase text-neutral-800">{pagination.totalItems} Products Found</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[calc(100vh-81px)]">
                {/* FILTER CONTROL BAR */}
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
                {/* PRODUCT SECTION */}
                <div className="lg:col-span-3 flex flex-col justify-between">
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center font-mono text-xs uppercase tracking-widest text-neutral-400 animate-pulse">Loading Products...</div>
                    ) : products.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center font-mono text-xs uppercase tracking-widest text-neutral-400">Zero Query Matches Located.</div>
                    ) : (
                        /* Grid Partition lines created purely out of structural borders */
                        <div className="grid grid-cols-1 md:grid-cols-3 border-b border-black">
                            {products.map((product) => (
                                <Link key={product._id} href={`products/${product.slug}`} className="border-b md:border-b-0 md:border-r border-black p-6 flex flex-col justify-between hover:bg-neutral-50 group transition-colors duration-300 min-h-[380px]">
                                    <div>
                                        <div className="relative w-full aspect-4/3 bg-neutral-100 flex items-center justify-center border border-neutral-200 group-hover:border-black transition-colors duration-300">
                                            <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">Image Content Frame</span>
                                            <Image src={product.productImages[0]} alt={product.productName} fill className="w-full h-full object-cover " />
                                        </div>
                                        <span className="text-[10px] font-bold tracking-widest uppercase text-neutral-400 font-mono mt-4 block">{product.brand }</span>
                                        <p className="font-thin text-lg leading-tight capitalize tracking-tight mt-1 group-hover:underline">{product.productName}</p>
                                    </div>

                                    <div className="mt-8 flex items-baseline gap-2 font-mono">
                                        {product.discountPrice ? (
                                            <>
                                                <span className="text-base font-black text-black">{formatPrice(product.discountPrice)}</span>
                                                <span className="text-xs text-neutral-400 line-through">{formatPrice(product.price)}</span>
                                            </>
                                        ) : (
                                            <span className="text-base font-black text-black">{formatPrice(product.price)}</span>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/*pagination  */}
                    <ProductPagination pagination={pagination} handlePageChange={handlePageChange} />
                </div>
            </div>
        </div>
    );
}