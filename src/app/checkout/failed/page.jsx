"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuthStore } from "@/app/store/authStore";
import { FiXCircle } from "react-icons/fi";

function FailedInner() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get("order");
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    const user = useAuthStore((s) => s.user);

    return (
        <DashboardLayout role="customer" email={user?.email}>
            <div className="max-w-md mx-auto px-4 py-20 text-center">
                <FiXCircle className="mx-auto text-red-500" size={64} />
                <h1 className="text-2xl font-bold mt-4">Payment failed</h1>
                <p className="text-gray-500 mt-2">Your order was created but payment was not completed. You can retry from your orders page.</p>
                {orderId && <p className="text-xs text-gray-400 mt-2">Order ID: {orderId}</p>}
                {reference && <p className="text-xs text-gray-400 mt-1">Reference: {reference}</p>}
                <div className="mt-8 flex flex-col gap-2">
                    <Link href="/account/orders" className="bg-black text-white py-3 rounded-md font-medium">Retry payment</Link>
                    <Link href="/cart" className="border py-3 rounded-md text-sm">Back to cart</Link>
                    <Link href="/account/orders" className="text-xs text-gray-500 underline">View my orders</Link>
                </div>
            </div>
        </DashboardLayout>
    );
}

export default function CheckoutFailedPage() {
    return (
        <Suspense fallback={
            <DashboardLayout role="customer">
                <div className="py-32 text-center text-sm text-gray-400 animate-pulse">Loading…</div>
            </DashboardLayout>
        }>
            <FailedInner />
        </Suspense>
    );
}
