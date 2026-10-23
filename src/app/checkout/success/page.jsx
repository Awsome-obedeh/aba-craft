"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuthStore } from "@/app/store/authStore";
import { useCartStore } from "@/app/store/cartStore";
import { api } from "@/app/lib/axios";
import { FiCheckCircle, FiXCircle, FiClock } from "react-icons/fi";

// Paystack redirects the customer back here after the hosted checkout. The
// charge.success webhook is the source of truth for whether the order was
// paid; this page only reflects that verdict to the customer, so it verifies
// the transaction against Paystack and reports what it finds.
function SuccessInner() {
    const searchParams = useSearchParams();
    // Paystack appends ?reference=...&trxref=... to the callback URL.
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    const user = useAuthStore((s) => s.user);
    const clearCart = useCartStore((s) => s.clear);

    const [state, setState] = useState(reference ? "verifying" : "failed");
    const [orderId, setOrderId] = useState(searchParams.get("order") || "");

    useEffect(() => {
        if (!reference) return;

        let cancelled = false;
        const verify = async () => {
            try {
                const res = await api.post("/payments/verify", { reference });
                if (cancelled) return;
                if (res.data?.success) {
                    setOrderId(res.data.orderId || "");
                    clearCart();
                    setState("success");
                    return;
                }
                setState(res.data?.status === "pending" ? "pending" : "failed");
            } catch (err) {
                if (cancelled) return;
                console.error("PAYMENT VERIFY ERROR:", err);
                // A 401 here means the session expired across the redirect, not
                // that the payment failed. The webhook still decides, so report
                // it as pending instead of telling the customer it failed.
                setState(err.response?.status === 401 ? "pending" : "failed");
            }
        };
        verify();
        return () => { cancelled = true; };
    }, [reference, clearCart]);

    const views = {
        verifying: {
            icon: <FiClock className="mx-auto text-amber-500" size={64} />,
            title: "Confirming your payment",
            body: "Hold on while we confirm the transaction with Paystack.",
        },
        success: {
            icon: <FiCheckCircle className="mx-auto text-green-500" size={64} />,
            title: "Payment successful",
            body: "Thank you for your order. The vendor has been notified.",
        },
        pending: {
            icon: <FiClock className="mx-auto text-amber-500" size={64} />,
            title: "Payment is processing",
            body: "We have received your payment and it is still being confirmed by the bank. Your order will be updated as soon as it clears.",
        },
        failed: {
            icon: <FiXCircle className="mx-auto text-red-500" size={64} />,
            title: "Payment was not completed",
            body: "Your order was created but the payment did not go through. You can retry the payment from your orders page.",
        },
    };

    const view = views[state] || views.verifying;

    return (
        <DashboardLayout role="customer" email={user?.email}>
            <div className="max-w-md mx-auto px-4 py-20 text-center">
                {view.icon}
                <h1 className="text-2xl font-bold mt-4">{view.title}</h1>
                <p className="text-gray-500 mt-2">{view.body}</p>
                {orderId && (
                    <p className="text-xs text-gray-400 mt-2">Order ID: {orderId}</p>
                )}
                {state === "success" && (
                    <p className="text-xs text-gray-400 mt-2">
                        Your cart has been cleared.
                    </p>
                )}
                <div className="mt-8 flex flex-col gap-2">
                    {state === "success" && (
                        <Link href="/dashboard/products" className="bg-black text-white py-3 rounded-md font-medium">Continue shopping</Link>
                    )}
                    {state === "failed" && (
                        <Link href="/account/orders" className="bg-black text-white py-3 rounded-md font-medium">Retry payment</Link>
                    )}
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
