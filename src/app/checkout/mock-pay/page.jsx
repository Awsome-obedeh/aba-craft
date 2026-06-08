"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuthStore } from "@/app/store/authStore";
import { api } from "@/app/lib/axios";
import { formatPrice } from "@/utils/priceFormater";
import { useCartStore } from "@/app/store/cartStore";

function MockPayInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const ref = searchParams.get("ref");
    const orderId = searchParams.get("order");
    const user = useAuthStore((s) => s.user);

    const [verifying, setVerifying] = useState(false);
    const startedRef = useRef(false);
    const clearCart = useCartStore((s) => s.clear);

    useEffect(() => {
        if (!orderId) {
            router.replace("/cart");
        }
    }, [orderId, router]);

    const total = Number(searchParams.get("amount")) || 0;

    const handlePay = async (outcome) => {
        if (startedRef.current) return;
        startedRef.current = true;
        setVerifying(true);
        try {
            const res = await api.post("/payments/mock/verify", { reference: ref, outcome });
            if (res.data?.success) {
                clearCart();
                toast.success("Payment successful");
                router.replace(`/checkout/success?order=${res.data.orderId}`);
            } else {
                toast.error("Payment failed");
                router.replace(`/checkout/failed?order=${res.data.orderId || orderId}`);
            }
        } catch (err) {
            console.error(err);
            toast.error("Verification error");
            router.replace("/cart");
        }
    };

    return (
        <DashboardLayout role="customer" email={user?.email}>
            <div className="max-w-md mx-auto px-4 py-16">
                <div className="bg-white border rounded-2xl p-8 shadow-sm text-center">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400">Mock Payment Gateway</p>
                    <h1 className="text-2xl font-bold mt-2">Confirm payment</h1>
                    <p className="text-sm text-gray-500 mt-2">
                        You will be charged <strong>{formatPrice(total)}</strong>.
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Ref: {ref}</p>

                    <div className="mt-8 space-y-3">
                        <button
                            disabled={verifying}
                            onClick={() => handlePay("success")}
                            className="w-full bg-black text-white py-3 rounded-md font-medium hover:opacity-90 transition disabled:opacity-50"
                        >
                            {verifying ? "Verifying…" : `Pay ${formatPrice(total)}`}
                        </button>
                        <button
                            disabled={verifying}
                            onClick={() => handlePay("fail")}
                            className="w-full border border-gray-200 text-gray-600 py-2 rounded-md text-sm hover:bg-gray-50 transition disabled:opacity-50"
                        >
                            Cancel / Fail
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-6">
                        This is a demo. No real money is moved.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}

export default function MockPayPage() {
    return (
        <Suspense fallback={
            <DashboardLayout role="customer">
                <div className="py-32 text-center text-sm text-gray-400 animate-pulse">Loading…</div>
            </DashboardLayout>
        }>
            <MockPayInner />
        </Suspense>
    );
}
