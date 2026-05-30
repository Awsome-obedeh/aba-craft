
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { formatPrice } from '@/utils/priceFormater';
import { api } from '@/app/lib/axios';


export default function ProductsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });
    const [loading, setLoading] = useState(true);

    // queries
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
                const res = await api.get(`/api/products?${searchParams.toString()}`);
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

        router.push(`/products?${params.toString()}`);
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
        setSearch(''); setCategory(''); setBrand(''); setMinPrice(''); setMaxPrice(''); setHasDiscount(false); setHasPercentageDiscount(false);
        router.push('/products');
    };

    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white antialiased">
            {/* Minimalist Top Nav Header Area */}
            <header className="border-b border-black py-6 px-6 md:px-12 flex justify-between items-baseline">
                <h1 className="text-2xl font-black uppercase tracking-tighter">Aba Crafts</h1>
                <p className="text-xs font-mono uppercase text-neutral-400">{pagination.totalItems} Objects Catalogued</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[calc(100vh-81px)]">
                {/* FILTER CONTROL BAR */}
                <form onSubmit={handleApplyFilters} className="border-b lg:border-b-0 lg:border-r border-black p-8 space-y-8 bg-white">
                    <div className="flex justify-between items-center">
                        <h2 className="text-sm font-bold uppercase tracking-widest">Filter System</h2>
                        <button type="button" onClick={handleClearFilters} className="text-xs uppercase underline tracking-wider opacity-60 hover:opacity-100 font-mono">Reset</button>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 font-mono text-neutral-400">Search</label>
                            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ENTER KEYWORD" className="w-full bg-white text-black border border-black px-3 py-2 text-xs font-mono tracking-wider focus:outline-none placeholder:text-neutral-300" />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 font-mono text-neutral-400">Category Identifier</label>
                            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="ENTER ID STRING" className="w-full bg-white text-black border border-black px-3 py-2 text-xs font-mono tracking-wider focus:outline-none placeholder:text-neutral-300" />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 font-mono text-neutral-400">Brand Label</label>
                            <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="ENTER MANUFACTURER" className="w-full bg-white text-black border border-black px-3 py-2 text-xs font-mono tracking-wider focus:outline-none placeholder:text-neutral-300" />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 font-mono text-neutral-400">Financial Bracket</label>
                            <div className="flex gap-2">
                                <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="MIN" className="w-1/2 bg-white text-black border border-black px-3 py-2 text-xs font-mono text-center focus:outline-none placeholder:text-neutral-300" />
                                <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="MAX" className="w-1/2 bg-white text-black border border-black px-3 py-2 text-xs font-mono text-center focus:outline-none placeholder:text-neutral-300" />
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 pt-2">
                            <input type="checkbox" id="discount" checked={hasDiscount} onChange={(e) => setHasDiscount(e.target.checked)} className="accent-black h-4 w-4 rounded-none border-black cursor-pointer" />
                            <label htmlFor="discount" className="text-xs font-bold uppercase tracking-wider cursor-pointer select-none">Exhibiting Reduction Price</label>
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-black text-white text-xs font-bold uppercase tracking-widest py-3 hover:bg-neutral-800 transition-colors duration-200">Update Output</button>
                </form>

                {/* PRODUCT SECTION */}
                <div className="lg:col-span-3 flex flex-col justify-between">
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center font-mono text-xs uppercase tracking-widest text-neutral-400 animate-pulse">Syncing Index Server...</div>
                    ) : products.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center font-mono text-xs uppercase tracking-widest text-neutral-400">Zero Query Matches Located.</div>
                    ) : (
                        /* Grid Partition lines created purely out of structural borders */
                        <div className="grid grid-cols-1 md:grid-cols-3 border-b border-black">
                            {products.map((product) => (
                                <div key={product._id} className="border-b md:border-b-0 md:border-r border-black p-6 flex flex-col justify-between hover:bg-neutral-50 group transition-colors duration-300 min-h-[380px]">
                                    <div>
                                        <div className="w-full aspect-[4/3] bg-neutral-100 flex items-center justify-center border border-neutral-200 group-hover:border-black transition-colors duration-300">
                                            <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">Image Content Frame</span>
                                        </div>
                                        <span className="text-[10px] font-bold tracking-widest uppercase text-neutral-400 font-mono mt-4 block">{product.brand || 'ARCHIVE LABEL'}</span>
                                        <h3 className="font-bold text-lg leading-tight uppercase tracking-tight mt-1 group-hover:underline">{product.name}</h3>
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
                                </div>
                            ))}
                        </div>
                    )}

                    {/* MINIMALIST BRUTALIST PAGINATION BAR */}
                    {pagination.totalPages > 1 && (
                        <footer className="border-t border-black p-6 flex justify-between items-center bg-white font-mono text-xs">
                            <button 
                                type="button"
                                disabled={pagination.currentPage === 1}
                                onClick={() => handlePageChange(pagination.currentPage - 1)}
                                className="px-4 py-2 border border-black uppercase font-bold tracking-wider disabled:opacity-20 disabled:cursor-not-allowed hover:bg-black hover:text-white transition-colors duration-200"
                            >
                                PREV
                            </button>

                            <div className="flex items-center space-x-1 font-bold">
                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => handlePageChange(p)}
                                        className={`w-8 h-8 flex items-center justify-center transition-colors duration-200 ${
                                            p === pagination.currentPage 
                                                ? 'bg-black text-white font-black' 
                                                : 'text-black hover:bg-neutral-100'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>

                            <button 
                                type="button"
                                disabled={pagination.currentPage === pagination.totalPages}
                                onClick={() => handlePageChange(pagination.currentPage + 1)}
                                className="px-4 py-2 border border-black uppercase font-bold tracking-wider disabled:opacity-20 disabled:cursor-not-allowed hover:bg-black hover:text-white transition-colors duration-200"
                            >
                                NEXT
                            </button>
                        </footer>
                    )}
                </div>
            </div>
        </div>
    );
}