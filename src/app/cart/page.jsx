"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useCartStore } from "@/app/store/cartStore";
import { useAuthStore } from "@/app/store/authStore";
import { formatPrice } from "@/utils/priceFormater";
import { SHIPPING_FEE_NGN } from "@/app/lib/orderPricing";
import { FiTrash2 } from "react-icons/fi";

const lineFinalPrice = (item) => {
    if (item.discountPrice > 0) return item.price - item.discountPrice;
    if (item.discountPercentage > 0) return item.price - (item.price * item.discountPercentage) / 100;
    return item.price;
};

export default function CartPage() {
    const router = useRouter();
    const items = useCartStore((s) => s.items);
    const updateQuantity = useCartStore((s) => s.updateQuantity);
    const removeItem = useCartStore((s) => s.removeItem);
    const clear = useCartStore((s) => s.clear);
    const user = useAuthStore((s) => s.user);
    // SSR-safe mounted flag — only true on the client.
    const [mounted] = useState(typeof window !== "undefined");

    if (!mounted) {
        return (
            <DashboardLayout role="customer">
                <div className="py-32 text-center text-sm text-gray-400 animate-pulse">Loading cart…</div>
            </DashboardLayout>
        );
    }

    const subtotal = items.reduce((s, i) => s + lineFinalPrice(i) * i.quantity, 0);
    const shipping = subtotal > 0 ? SHIPPING_FEE_NGN : 0;
    const total = subtotal + shipping;

    return (
        <DashboardLayout role="customer" email={user?.email}>
            <h1 className="text-2xl md:text-3xl font-bold">Your cart</h1>
            {items.length === 0 ? (
                <div className="py-20 text-center">
                    <p className="text-gray-500">Your cart is empty.</p>
                    <Link href="/dashboard/products" className="inline-block mt-4 bg-black text-white px-5 py-2 rounded-md text-sm">
                        Continue shopping
                    </Link>
                </div>
            ) : (
                <div className="mt-8 grid md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-4">
                        {items.map((item) => {
                            const final = lineFinalPrice(item);
                            return (
                                <div key={item.productId} className="flex gap-4 border border-gray-200 rounded-2xl p-4">
                                    <div className="relative w-24 h-24 bg-gray-50 rounded-md overflow-hidden shrink-0">
                                        {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <Link href={`/dashboard/products/${item.slug}`} className="font-medium hover:underline line-clamp-1">
                                            {item.name}
                                        </Link>
                                        <p className="text-xs text-gray-500">{item.brand}</p>
                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="flex items-center border rounded-md">
                                                <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="px-2 py-1 text-sm">−</button>
                                                <span className="px-3 text-sm">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                                    className="px-2 py-1 text-sm"
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-sm">{formatPrice(final * item.quantity)}</p>
                                                {final < item.price && (
                                                    <p className="text-xs text-gray-400 line-through">{formatPrice(item.price * item.quantity)}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            removeItem(item.productId);
                                            toast.info("Removed from cart");
                                        }}
                                        className="text-gray-400 hover:text-red-500 self-start"
                                        aria-label="Remove"
                                    >
                                        <FiTrash2 size={18} />
                                    </button>
                                </div>
                            );
                        })}

                        <div className="flex justify-between items-center pt-2">
                            <button onClick={() => { clear(); toast.info("Cart cleared"); }} className="text-xs text-gray-500 hover:underline">
                                Clear cart
                            </button>
                        </div>
                    </div>

                    <aside className="border border-gray-200 rounded-2xl p-6 h-fit sticky top-24">
                        <h2 className="font-bold text-lg">Order summary</h2>
                        <dl className="mt-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Subtotal</dt>
                                <dd>{formatPrice(subtotal)}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Shipping</dt>
                                <dd>{formatPrice(shipping)}</dd>
                            </div>
                            <div className="flex justify-between font-bold text-base pt-2 border-t">
                                <dt>Total</dt>
                                <dd>{formatPrice(total)}</dd>
                            </div>
                        </dl>
                        {user ? (
                            <button
                                onClick={() => router.push("/checkout")}
                                className="w-full mt-6 bg-black text-white py-3 rounded-md font-medium hover:opacity-90 transition"
                            >
                                Checkout
                            </button>
                        ) : (
                            <Link
                                href="/auth/sign-in"
                                className="block w-full mt-6 bg-black text-white py-3 rounded-md font-medium text-center hover:opacity-90 transition"
                            >
                                Sign in to checkout
                            </Link>
                        )}
                    </aside>
                </div>
            )}
        </DashboardLayout>
    );
}
