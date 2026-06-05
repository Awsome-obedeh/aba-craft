"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuthStore } from "@/app/store/authStore";
import { FiCheckCircle } from "react-icons/fi";

function SuccessInner() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get("order");
    const user = useAuthStore((s) => s.user);

    return (
        <DashboardLayout role="customer" email={user?.email}>
            <div className="max-w-md mx-auto px-4 py-20 text-center">
                <FiCheckCircle className="mx-auto text-green-500" size={64} />
                <h1 className="text-2xl font-bold mt-4">Payment successful</h1>
                <p className="text-gray-500 mt-2">Thank you for your order. The vendor has been notified.</p>
                {orderId && (
                    <p className="text-xs text-gray-400 mt-2">Order ID: {orderId}</p>
                )}
                <div className="mt-8 flex flex-col gap-2">
                    <Link href="/dashboard/products" className="bg-black text-white py-3 rounded-md font-medium">Continue shopping</Link>
                    <Link href="/account/orders" className="border py-3 rounded-md text-sm">View my orders</Link>
                </div>
            </div>
        </DashboardLayout>
    );
}

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={
            <DashboardLayout role="customer">
                <div className="py-32 text-center text-sm text-gray-400 animate-pulse">Loading…</div>
            </DashboardLayout>
        }>
            <SuccessInner />
        </Suspense>
    );
}
