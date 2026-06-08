"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuthStore } from "@/app/store/authStore";
import { api } from "@/app/lib/axios";
import { formatPrice } from "@/utils/priceFormater";
import { formatDate } from "@/utils/DateFormater";

const STATUS_STYLES = {
    pending_payment: "bg-yellow-100 text-yellow-800",
    paid: "bg-blue-100 text-blue-800",
    processing: "bg-indigo-100 text-indigo-800",
    shipped: "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-gray-200 text-gray-700",
};

const fmtStatus = (s) => s.replace(/_/g, " ");

export default function MyOrdersPage() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await api.get("/orders");
                if (cancelled) return;
                setOrders(res.data.data || []);
            } catch (err) {
                if (cancelled) return;
                console.error(err);
                if (err.response?.status === 401) {
                    toast.error("Please sign in");
                    router.push("/auth/sign-in");
                } else {
                    toast.error("Could not load orders");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [router]);

    const handleRetryPayment = async (orderId) => {
        try {
            setRetrying(orderId);
            const res = await api.post("/payments/mock/init", { orderId });
            if (res.data?.success) {
                router.push(res.data.authorizationUrl);
            } else {
                toast.error(res.data?.message || "Could not restart payment");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Error");
        } finally {
            setRetrying(null);
        }
    };

    return (
        <DashboardLayout role="customer" email={user?.email}>
            <h1 className="text-2xl md:text-3xl font-bold">My orders</h1>

            {loading ? (
                <div className="py-24 text-center text-sm text-gray-400 animate-pulse">Loading…</div>
            ) : orders.length === 0 ? (
                <div className="py-24 text-center text-gray-500">
                    You haven&apos;t placed any orders yet.{" "}
                    <Link href="/dashboard/products" className="underline">Start shopping →</Link>
                </div>
            ) : (
                <div className="mt-8 space-y-4">
                    {orders.map((o) => (
                        <article key={o._id} className="border border-gray-200 rounded-2xl p-5">
                            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-3 mb-3">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-widest">Order</p>
                                    <p className="font-mono text-sm">#{o._id.slice(-8).toUpperCase()}</p>
                                </div>
                                <p className="text-xs text-gray-500">{formatDate(o.createdAt)}</p>
                                <span className={`text-xs px-3 py-1 rounded-full font-bold ${STATUS_STYLES[o.status] || "bg-gray-100 text-gray-700"}`}>
                                    {fmtStatus(o.status)}
                                </span>
                            </header>
                            <ul className="space-y-2">
                                {o.items.map((it, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm">
                                        <div className="w-10 h-10 rounded bg-gray-50 overflow-hidden shrink-0 flex items-center justify-center text-gray-300 text-xs">
                                            {it.productImage ? (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img src={it.productImage} alt="" className="w-full h-full object-cover" />
                                            ) : "—"}
                                        </div>
                                        <span className="flex-1 truncate">{it.productName}</span>
                                        <span className="text-xs text-gray-500">×{it.quantity}</span>
                                        <span className="font-medium">{formatPrice(it.unitPrice * it.quantity)}</span>
                                    </li>
                                ))}
                            </ul>
                            <footer className="mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-sm">
                                <div>
                                    <p className="text-xs text-gray-500">Total</p>
                                    <p className="font-bold">{formatPrice(o.total)}</p>
                                </div>
                                {o.status === "pending_payment" && (
                                    <button
                                        onClick={() => handleRetryPayment(o._id)}
                                        disabled={retrying === o._id}
                                        className="bg-black text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
                                    >
                                        {retrying === o._id ? "Loading…" : "Retry payment"}
                                    </button>
                                )}
                            </footer>
                        </article>
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}
