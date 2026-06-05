
'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/app/lib/axios';
import EditProductModal from '@/components/EditProductModal';
import { formatPrice } from '@/utils/priceFormater';
import Link from 'next/link';
import { formatDate } from '@/utils/DateFormater';
import { useAuthStore } from '@/app/store/authStore';
import { useCartStore } from '@/app/store/cartStore';
import DashboardLayout from "@/components/layout/DashboardLayout";
import { IoChevronBackCircleOutline } from "react-icons/io5";
import { toast } from 'react-toastify';

export default function ProductDetailsPage({ params }) {
    const router = useRouter();
    const { slug } = use(params);

    // Context Loading and Sync Data States
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Customer-facing add-to-cart
    const [qty, setQty] = useState(1);
    const addToCart = useCartStore((s) => s.addItem);

    // Interactive Core Image Gallery Mechanics Configuration
    const [activeImage, setActiveImage] = useState('');
    const [zoomStyle, setZoomStyle] = useState({ display: 'none', backgroundPosition: '0% 0%' });
    const { user, accessToken } = useAuthStore();
    const fetchProductDetails = async () => {
        try {
            const res = await api.get(`/products/${slug}`);
            const data = res.data.data;
            setProduct(data);
            // Initialize the main image display context utilizing the first image productImages array
            if (data.productImages && data.productImages.length > 0) {
                setActiveImage(data.productImages[0]);
            }
        } catch (error) {
            if (error.response) {
                toast.error(
                    error.response.data.message ||
                    "Something went wrong"
                );
            }

            // Network error
            else if (error.request) {
                toast.error(
                    "Network error. Check your internet connection."
                );
            }

            // Unexpected error
            else {
                toast.error(
                    "Unexpected error occurred"
                );
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {

        if (!accessToken && !user) {
            router.push('/auth/sign-in');
        }

        fetchProductDetails();
    }, [slug]);

    console.log("Loaded product details:", product);

    // Zero-Dependency Magnification Math Processing Engine (Pan-On-Hover)
    const handleMouseMove = (e) => {
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();

        // Deduce exact hover coordinate percent positions inside the element block frame geometry boundaries
        const x = ((e.pageX - left - window.scrollX) / width) * 100;
        const y = ((e.pageY - top - window.scrollY) / height) * 100;

        setZoomStyle({
            display: 'block',
            backgroundImage: `url(${activeImage})`,
            backgroundSize: '150%', // Magnification Factor scale set at 2x bounds zoom
            backgroundPosition: `${x}% ${y}%`,
        });
    };

    const handleMouseLeave = () => {
        setZoomStyle({ display: 'none', backgroundPosition: '0% 0%' });
    };

    if (loading) return <div className="min-h-screen bg-white text-black flex items-center justify-center  text-xs uppercase tracking-widest animate-pulse">loading...</div>;
    if (!product) return <div className="min-h-screen bg-white text-black flex items-center justify-center  text-xs uppercase tracking-widest">No Data Found.</div>;


    const role = user?.role;
    const email = user?.email;
    return (

        <DashboardLayout role={role} email={email}>
            <div className="min-h-screen bg-white text-black antialiased selection:bg-black selection:text-white">
                <header className="border-b border-black py-6 px-6 md:px-12 flex justify-between items-baseline">
                    <button onClick={() => router.push('/dashboard/products')} className="text-md font-semibold  uppercase tracking-widest bg-black py-2 rounded-md px-3 text-white hover:bg-gray-800 transition-colors">
                        <IoChevronBackCircleOutline size={24} />
                    </button>
                    <p className="text-md uppercase text-black-400">Brand: {product?.brand}</p>
                </header>

                <main className="grid grid-cols-1 md:grid-cols-2 min-h-[calc(100vh-69px)]">

                    <div className="p-8 md:p-12 flex flex-col justify-center bg-neutral-50 border-b md:border-b-0 md:border-r border-black space-y-6">


                        <div
                            className="w-full aspect-square bg-white border border-black relative overflow-hidden cursor-crosshair group flex items-center justify-center"
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                        >

                            <img src={activeImage} alt={product.name} className="max-h-[85%] max-w-[85%]
                            object-contain transition-opacity duration-200 group-hover:opacity-0" />


                            <div
                                className="absolute inset-0 bg-no-repeat pointer-events-none transition-transform duration-75 ease-out"
                                style={zoomStyle}
                            />
                        </div>


                        {product.productImages.length > 1 && (
                            <div className="grid grid-cols-4 gap-4 ">
                                {product.productImages.map((imgUrl, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setActiveImage(imgUrl)}
                                        className={`aspect-square bg-white border flex items-center justify-center p-2 group transition-all duration-200 ${activeImage === imgUrl
                                            ? 'border-black border-2 shadow-xs'
                                            : 'border-neutral-200 hover:border-black'
                                            }`}
                                    >

                                        <img src={imgUrl} alt={`Thumbnail allocation view reference ${idx + 1}`} className="max-h-full max-w-full object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Product SPEC DETAILS section */}
                    <div className="p-8 md:p-12 flex flex-col justify-between">
                        {product.featured && (
                            <div className="w-full bg-amber-600 text-white p-4 font-bold py-2 ">Featured Product</div>

                        )}
                        <div className="space-y-6">
                            <div>
                                <span className="text-xs py-3 font-bold tracking-widest  text-neutral-400 uppercase block mb-1">
                                    {product?.brand || "product brand"} |
                                    <Link href={`/dashboard/products?brand=${product.brand}`} className="text-blue-500 hover:underline">
                                        Similar products from brand
                                    </Link>
                                </span>
                                <p className="text-md md:text-2xl   tracking-tighter leading-none">
                                    {product?.productName || "product name"}
                                </p>
                            </div>

                            <div className="mt-8 flex items-baseline gap-2 font-mono">
                                {product.discountPrice > 0 ? (
                                    <>
                                        <span className="text-base font-black text-black">{formatPrice(product.price - product.discountPrice)}</span>
                                        <span className="text-xs text-neutral-500 line-through">{formatPrice(product.price)}</span>
                                    </>

                                ) : product.discountPercentage > 0 ? (
                                    <>


                                        <span className=" text-base font-black text-black">{formatPrice(((product.price - (product.discountPercentage / 100) * product.price)))}</span>
                                        <span className="text-xs text-neutral-500 line-through">{formatPrice(product.price)}</span>

                                        <span className="text-xs bg-green-200 p-2 rounded-sm text-green-600 font-bold ml-auto">{product.discountPercentage}% OFF</span>

                                    </>
                                ) :
                                    (<span className="text-base font-black text-black">{formatPrice(product.price)}</span>)


                                }



                            </div>

                            <div className="space-y-3  text-xs">
                                <div className="flex justify-between border-b border-neutral-100 pb-2">
                                    <span className="text-black uppercase"> Category</span>
                                    <span className="font-bold uppercase">{product.category}</span>
                                </div>

                                <div className="flex justify-between border-b border-neutral-100 pb-2">
                                    <span className="text-black uppercase"> InStock</span>
                                    <span className="font-bold uppercase">{product?.quantity} left</span>
                                </div>
                                <div className="flex justify-between border-b border-neutral-100 pb-2">
                                    <span className="text-black uppercase"> status</span>

                                    <span
                                        className={`px-3 py-1 rounded-full text-sm ${product.status === "approved"
                                            ? "bg-green-300 text-green-700"
                                            : product.status === "rejected"
                                                ? "bg-red-200 text-red-800"
                                                : product.status === "under_review"
                                                    ? "bg-yellow-200 text-orange-800"
                                                    : "bg-gray-200 text-gray-700"
                                            }`}
                                    >
                                        {product.status}
                                    </span>
                                </div>
                                <div className="flex justify-between border-b border-neutral-100 pb-2">
                                    <span className="text-black uppercase"> Product Visible To Buyers</span>

                                    <span
                                        className={`px-3 py-1 rounded-full text-sm ${product.published
                                            ? "bg-green-300 text-green-700"
                                            : "bg-gray-200 text-gray-700"

                                            }`}
                                    >
                                        {product.published ? "Visible" : "Hidden"}
                                    </span>
                                </div>

                                <div className="flex justify-between border-b border-neutral-100 pb-2">
                                    <span className="text-black uppercase"> Date Created</span>
                                    <span className="font-bold uppercase">{formatDate(product?.createdAt)}</span>
                                </div>


                                {/* rejection reason */}
                                {product.status === "rejected" && (
                                    <div className="flex justify-between border-b border-neutral-100 pb-2">
                                        <span className="text-black uppercase"> Rejection Reason</span>
                                        <span className="font-bold leading-relaxed whitespace-pre-wrap -tracking-wide">{product?.rejectionReason}</span>
                                    </div>
                                )}
                                {/* <div className="flex justify-between border-b border-neutral-100 pb-2">
                                    <span className="text-neutral-400 uppercase">Index Routing Slug</span>
                                    <span className="font-bold">{product?.slug}</span>
                                </div> */}
                            </div>

                            <div className="pt-4">
                                <p className="text-xs uppercase tracking-widest font-bold mb-2">Product Description</p>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap tracking-widest">{product?.description || "No description provided for this product."}</p>
                            </div>
                        </div>

                        <div className="mt-12 space-y-3">
                            {user?.role === "customer" ? (
                                <>
                                    {/* Customer purchase actions */}
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs uppercase tracking-widest text-neutral-500">Quantity</span>
                                        <div className="flex items-center border border-black rounded-md">
                                            <button
                                                type="button"
                                                onClick={() => setQty((q) => Math.max(1, q - 1))}
                                                className="px-3 py-2 hover:bg-black hover:text-white transition"
                                                aria-label="Decrease quantity"
                                            >−</button>
                                            <span className="px-4 py-2 min-w-12 text-center font-mono">{qty}</span>
                                            <button
                                                type="button"
                                                onClick={() => setQty((q) => Math.min(product?.quantity || 1, q + 1))}
                                                className="px-3 py-2 hover:bg-black hover:text-white transition"
                                                aria-label="Increase quantity"
                                            >+</button>
                                        </div>
                                        <span className="text-[10px] text-neutral-500 ml-auto">{product?.quantity} in stock</span>
                                    </div>

                                    <button
                                        type="button"
                                        disabled={!product || (product.quantity ?? 0) <= 0}
                                        onClick={() => {
                                            if (!product) return;
                                            addToCart(product, qty);
                                            toast.success(`Added ${qty} × ${product.productName} to cart`);
                                        }}
                                        className="w-full bg-black text-white py-3 rounded-md font-medium hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {(product?.quantity ?? 0) <= 0 ? "Out of stock" : "Add to cart"}
                                    </button>

                                    <button
                                        type="button"
                                        disabled={!product || (product.quantity ?? 0) <= 0}
                                        onClick={() => {
                                            if (!product) return;
                                            addToCart(product, qty);
                                            router.push("/cart");
                                        }}
                                        className="w-full border border-black py-3 rounded-md font-medium hover:bg-black hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Buy now
                                    </button>
                                </>
                            ) : (
                                /* Vendor / admin: edit product */
                                <button
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="w-full bg-black text-white py-3 rounded-md font-medium hover:opacity-90 transition"
                                >
                                    Edit Product Details
                                </button>
                            )}
                        </div>
                    </div>
                </main>

                <EditProductModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    product={product}
                    loading={loading}
                    onSave={async (fields) => {
                        try {
                            setLoading(true);
                            const res = await api.put(`/products/${product.slug}`, fields);
                            if (res.data.success) {
                                setLoading(false);
                                setProduct(res.data.data);
                                toast.success("Product updated successfully!");
                                setIsEditModalOpen(false);
                            }
                        } catch (error) {
                            setLoading(false);
                            console.error("EDITING PRODUCT ERROR:", error);
                            if (error.response) {
                                toast.error(
                                    error.response.data.message ||
                                    "Something went wrong"
                                );
                            }

                            // Network error
                            else if (error.request) {
                                toast.error(
                                    "Network error. Check your internet connection."
                                )
                            }

                            // Unexpected error
                            else {
                                toast.error(
                                    "Unexpected error occurred"
                                );
                            }
                        }

                    }}
                    // take role to decide admin having more update features than regular users in the future, such as modifying product status, featured flag, and publish visibility

                    role={role}
                />
            </div>
        </DashboardLayout>
    );
}