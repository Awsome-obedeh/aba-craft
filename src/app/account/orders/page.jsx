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
import EscrowCard from "@/components/EscrowCard";

const STATUS_STYLES = {
    pending_payment: "bg-yellow-100 text-yellow-800",
    paid: "bg-blue-100 text-blue-800",
    processing: "bg-indigo-100 text-indigo-800",
    shipped: "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-gray-200 text-gray-700",
};

const fmtStatus = (s) => s.replace(/_/g, " ");

// Escrow only exists once payment is captured, so there is nothing to show for
// an unpaid or cancelled order.
const ESCROW_STATUSES = ["paid", "processing", "shipped", "delivered"];

const fmt = (s) => s.replace(/_/g, " ");

// The escrow read model for one order: one card per vendor slice, from
// GET /api/orders/{id}/escrow. Customer-only actions (confirm receipt, open a
// dispute) are exposed via the card's `role="customer"` prop.
function OrderEscrow({ orderId }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await api.get(`/orders/${orderId}/escrow`);
                if (!cancelled) {
                    setItems(res.data?.items || []);
                    setError("");
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.response?.data?.message || "Could not load escrow details");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [orderId, reloadKey]);

    if (loading) {
        return <p className="text-xs text-gray-400 animate-pulse">Loading escrow…</p>;
    }
    if (error) {
        return <p className="text-xs text-red-600">{error}</p>;
    }
    if (items.length === 0) return null;

    return (
        <div className="space-y-3">
            {items.map((item) => (
                <EscrowCard
                    key={item.vendorOrderId}
                    orderId={orderId}
                    item={item}
                    role="customer"
                    busyId={busyId}
                    onAction={(id, busy) => setBusyId(busy ? id : null)}
                    onChanged={() => setReloadKey((k) => k + 1)}
                />
            ))}
        </div>
    );
}

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
            // Re-initializes the Paystack transaction for this order and hands
            // the customer back to Paystack's hosted checkout.
            const res = await api.post("/payments/init", { orderId });
            if (res.data?.success) {
                window.location.assign(res.data.authorizationUrl);
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
                    <Link href="../market-place" className="underline">Start shopping →</Link>
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
                            {ESCROW_STATUSES.includes(o.status) && (
                                <section className="mt-4 border-t pt-4">
                                    <p className="text-xs font-bold uppercase text-gray-400 mb-2">Escrow</p>
                                    <OrderEscrow orderId={o._id} />
                                </section>
                            )}
                            <footer className="mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-sm">
                                <div>
                                    <p className="text-xs text-gray-500">Total</p>
                                    <p className="font-bold">{formatPrice(o.total)}</p>
                                </div>
                                {o.status === "pending_payment" &&
                                    o.paymentStatus !== "paid" &&
                                    o.paymentStatus !== "refunded" && (
                                    <button
                                        onClick={() => handleRetryPayment(o._id)}
                                        disabled={retrying === o._id}
                                        className="bg-black text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
                                    >
                                        {retrying === o._id
                                            ? "Loading…"
                                            : o.paymentStatus === "failed"
                                                ? "Retry payment"
                                                : "Pay now"}
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
