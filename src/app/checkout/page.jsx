"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Image from "next/image";
import Link from "next/link";
import { toast } from "react-toastify";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useCartStore } from "@/app/store/cartStore";
import { useAuthStore } from "@/app/store/authStore";
import { formatPrice } from "@/utils/priceFormater";
import { SHIPPING_FEE_NGN } from "@/app/lib/orderPricing";
import { api } from "@/app/lib/axios";

const lineFinalPrice = (item) => {
    if (item.discountPrice > 0) return item.price - item.discountPrice;
    if (item.discountPercentage > 0) return item.price - (item.price * item.discountPercentage) / 100;
    return item.price;
};

export default function CheckoutPage() {
    const router = useRouter();
    const items = useCartStore((s) => s.items);
    const user = useAuthStore((s) => s.user);
    // SSR-safe mounted flag — only true on the client.
    const [mounted] = useState(typeof window !== "undefined");
    const [submitting, setSubmitting] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            fullName: user?.fullName || "",
        },
    });

    // Accounts are required to check out
    useEffect(() => {
        if (mounted && !user) {
            router.push("/auth/sign-in");
        }
    }, [mounted, user, router]);

    if (!mounted) {
        return (
            <DashboardLayout role="customer">
                <div className="py-32 text-center text-sm text-gray-400 animate-pulse">Loading…</div>
            </DashboardLayout>
        );
    }

    if (!user) {
        return (
            <DashboardLayout role="customer">
                <div className="py-32 text-center">
                    <p className="text-gray-500">Please sign in to complete checkout.</p>
                    <Link href="/auth/sign-in" className="inline-block mt-4 bg-black text-white px-5 py-2 rounded-md text-sm">
                        Sign in
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    if (items.length === 0) {
        return (
            <DashboardLayout role="customer" email={user.email}>
                <div className="py-32 text-center">
                    <p className="text-gray-500">Your cart is empty.</p>
                    <Link href="/dashboard/products" className="inline-block mt-4 bg-black text-white px-5 py-2 rounded-md text-sm">
                        Browse products
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    const subtotal = items.reduce((s, i) => s + lineFinalPrice(i) * i.quantity, 0);
    const shipping = SHIPPING_FEE_NGN;
    const total = subtotal + shipping;

    const onSubmit = async (data) => {
        try {
            setSubmitting(true);

            // 1. Create the order (validates stock + re-prices against DB).
            //    Use `api` (not bare axios) so the Authorization header is
            //    attached — /api/orders requires a bearer token.
            const orderRes = await api.post("/orders", {
                items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
                shippingAddress: {
                    fullName: data.fullName,
                    phone: data.phone,
                    addressLine: data.addressLine,
                    city: data.city,
                    state: data.state,
                    notes: data.notes || "",
                },
                paymentMethod: "mock",
            });

            if (!orderRes.data?.success) {
                toast.error(orderRes.data?.message || "Could not create order");
                return;
            }
            const orderId = orderRes.data.data._id;

            // 2. Initialize payment (mock Paystack)
            const payRes = await api.post("/payments/mock/init", { orderId });
            if (!payRes.data?.success) {
                toast.error(payRes.data?.message || "Could not start payment");
                return;
            }

            // 3. Redirect to simulated gateway
            router.push(payRes.data.authorizationUrl);
        } catch (error) {
            console.error("CHECKOUT ERROR:", error);
            if (error.response) toast.error(error.response.data?.message || "Server error");
            else if (error.request) toast.error("Network error");
            else toast.error("Unexpected error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DashboardLayout role="customer" email={user.email}>
            <h1 className="text-2xl md:text-3xl font-bold">Checkout</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    <section className="border rounded-2xl p-5">
                        <h2 className="font-bold text-lg">Contact</h2>
                        <div className="mt-4 grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium">Full name</label>
                                <input
                                    {...register("fullName", { required: "Required" })}
                                    className="w-full mt-1 border rounded-md p-2.5 text-sm"
                                />
                                {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
                            </div>
                            <div>
                                <label className="text-xs font-medium">Email</label>
                                <p className="mt-1 border rounded-md p-2.5 text-sm bg-gray-50 text-gray-600">
                                    {user?.email}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-1">
                                    From your account. To use a different email, update your profile.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="border rounded-2xl p-5">
                        <h2 className="font-bold text-lg">Shipping address</h2>
                        <div className="mt-4 grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium">Phone</label>
                                <input
                                    {...register("phone", { required: "Required", minLength: { value: 7, message: "Too short" } })}
                                    className="w-full mt-1 border rounded-md p-2.5 text-sm"
                                />
                                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                            </div>
                            <div>
                                <label className="text-xs font-medium">State</label>
                                <input
                                    {...register("state", { required: "Required" })}
                                    className="w-full mt-1 border rounded-md p-2.5 text-sm"
                                />
                                {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state.message}</p>}
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-medium">Address line</label>
                                <input
                                    {...register("addressLine", { required: "Required" })}
                                    className="w-full mt-1 border rounded-md p-2.5 text-sm"
                                />
                                {errors.addressLine && <p className="text-red-500 text-xs mt-1">{errors.addressLine.message}</p>}
                            </div>
                            <div>
                                <label className="text-xs font-medium">City</label>
                                <input
                                    {...register("city", { required: "Required" })}
                                    className="w-full mt-1 border rounded-md p-2.5 text-sm"
                                />
                                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
                            </div>
                            <div>
                                <label className="text-xs font-medium">Delivery notes (optional)</label>
                                <input
                                    {...register("notes")}
                                    className="w-full mt-1 border rounded-md p-2.5 text-sm"
                                />
                            </div>
                        </div>
                    </section>

                    <section className="border rounded-2xl p-5">
                        <h2 className="font-bold text-lg">Payment</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            For this demo, payment is simulated. Clicking <em>Pay</em> will succeed automatically.
                        </p>
                    </section>
                </div>

                <aside className="border border-gray-200 rounded-2xl p-5 h-fit sticky top-24">
                    <h2 className="font-bold text-lg">Your order</h2>
                    <ul className="mt-4 space-y-3 max-h-72 overflow-auto pr-2">
                        {items.map((i) => {
                            const final = lineFinalPrice(i);
                            return (
                                <li key={i.productId} className="flex gap-3 text-sm">
                                    <div className="relative w-12 h-12 rounded-md overflow-hidden bg-gray-50 shrink-0">
                                        {i.image && <Image src={i.image} alt="" fill className="object-cover" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="line-clamp-1">{i.name}</p>
                                        <p className="text-xs text-gray-500">Qty {i.quantity}</p>
                                    </div>
                                    <p className="font-medium">{formatPrice(final * i.quantity)}</p>
                                </li>
                            );
                        })}
                    </ul>
                    <dl className="mt-4 space-y-2 text-sm border-t pt-4">
                        <div className="flex justify-between"><dt className="text-gray-500">Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
                        <div className="flex justify-between"><dt className="text-gray-500">Shipping</dt><dd>{formatPrice(shipping)}</dd></div>
                        <div className="flex justify-between font-bold text-base pt-2 border-t"><dt>Total</dt><dd>{formatPrice(total)}</dd></div>
                    </dl>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full mt-5 bg-black text-white py-3 rounded-md font-medium hover:opacity-90 transition disabled:opacity-50"
                    >
                        {submitting ? "Processing…" : `Pay ${formatPrice(total)}`}
                    </button>
                    <p className="text-[10px] text-gray-400 text-center mt-3">
                        By placing this order you agree to AbaCraft&apos;s terms.
                    </p>
                </aside>
            </form>
        </DashboardLayout>
    );
}
