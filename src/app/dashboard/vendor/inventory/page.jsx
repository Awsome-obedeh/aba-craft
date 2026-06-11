'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from "@/components/layout/DashboardLayout";
import LoadingScreen from '@/components/LoadingScreen'; // Use our nice spinner!
import { useAuthStore } from '@/app/store/authStore';
import ProductCard from '@/components/ProductCard';
import OrdersTable from '@/components/Orders';
import StatsCard from '@/components/StatsCard';
import FlowInsight from '@/components/FlowInsight';
import CategoryCard from '@/components/CategoryCard';
import Link from 'next/link';
import { api } from '@/app/lib/axios';


export default function InventoryPage() {
    const router = useRouter();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [prodLoading, setProdLoading] = useState(true);
    const [catLoading, setCatLoading] = useState(true);


    const { user, accessToken } = useAuthStore();
    console.log("InventoryPage rendered. User:", user, "Token:", accessToken);

    const fetchProducts = async () => {
        setProdLoading(true);
        try {
            const res = await api.get('/products/vendor');
            setProducts(res.data.products);
        }

        catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setProdLoading(false);
        }
    }
    const fetchCategories = async () => {
        setCatLoading(true);
        try {
            const res = await api.get('/category/stats');
            setCategories(res.data.categories);
        }

        catch (error) {
            console.error("Error fetching categories:", error);
        } finally {
            setCatLoading(false);
        }
    }

    useEffect(() => {
        // If the AuthProvider finished checking and we still have no token,
        // it means the session is invalid or expired. Kick them to sign-in.
        if (!accessToken && !user) {
            router.push('/auth/sign-in');
        }

        (async () => {
            await fetchProducts();
            await fetchCategories();
        })();
    }, [accessToken, user, router]);

    // console.log(products)

    // Show a loading spinner while determining auth status
    const role = user?.role;
    const email = user?.email;

    return (
        <DashboardLayout role={role} email={email}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">
                        My Inventory
                    </h1>

                    <p className="text-gray-500">
                        View and manage your products and categories. Keep your inventory up-to-date to attract more customers!
                    </p>
                </div>

                <Link href="upload-product" className="bg-black text-white px-5 py-3 rounded-lg">
                    + Add Product
                </Link>
            </div>

            <div className="grid lg:grid-cols-4 gap-6">

                {/* LEFT */}
                <div className="lg:col-span-3">

                    {/* Categories */}
                    <div className="bg-white p-5 rounded-xl shadow-sm mb-6">

                        <div className="flex justify-between mb-4">
                            <h2 className="font-semibold">
                                Categories & Stocks
                            </h2>


                        </div>

                        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">

                            {catLoading ? (
                                <p>Loading categories...</p>
                            ) : (
                                categories.length > 0 ? (
                                    categories.map((item) => (
                                        <CategoryCard
                                            key={item._id}
                                            category={item}
                                        />
                                    ))
                                ) : (
                                    <p className="text-gray-500">
                                        No categories found.
                                    </p>
                                )
                            )}


                        </div>
                    </div>

                    {/* Products */}

                    <div className="bg-white p-5 rounded-xl shadow-sm">

                        <div className="flex justify-between mb-5">
                            <h2 className="font-semibold">
                                Product Details
                            </h2>

                            {products.length > 0 && (
                                <Link href="/dashboard/products" className="text-blue-500 cursor-pointer underline">
                                    See All
                                </Link>

                            )}

                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">

                            {
                                prodLoading ? (
                                    <p>Loading products...</p>
                                ) :
                                    products.length > 0 && products.slice(0, 6).map((product) => (
                                        <ProductCard
                                            key={product._id}
                                            product={product}
                                            role={role}
                                            setProducts={setProducts}
                                        />
                                    )) || (
                                        <div className='flex items-center justify-center gap-4'>

                                            <p className="text-gray-500">
                                                No products found.

                                            </p>
                                            <Link href="upload-product" className="bg-black text-center text-white w-max px-3 py-2 rounded-md ">
                                                Add products
                                            </Link>
                                        </div>
                                    )}

                        </div>

                    </div>

                    <OrdersTable />

                </div>

                {/* RIGHT */}

                <div className="space-y-5">

                    <StatsCard />

                    <FlowInsight />

                </div>
            </div>




        </DashboardLayout>
    );
}