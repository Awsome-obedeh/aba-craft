"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import DashboardLayout from "@/components/layout/DashboardLayout";
import EscrowCard from "@/components/EscrowCard";
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

const NEXT_STATUS = {
    paid: "processing",
    processing: "shipped",
    shipped: "delivered",
};

// Escrow only exists once the payment is captured, so there is nothing to
// show for an order that has not been paid (or one that was cancelled).
const ESCROW_STATUSES = ["paid", "processing", "shipped", "delivered"];

const fmt = (s) => s.replace(/_/g, " ");

// The escrow read model for one order: one card per vendor slice, from
// GET /api/orders/{id}/escrow. A vendor only ever sees their own slice, and
// the customer-only actions (confirm receipt, open a dispute) are hidden by
// the card's `role` prop.
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
    // No escrow slices yet: the order has not been paid, or holds nothing for
    // this vendor. Either way there is nothing to render.
    if (items.length === 0) return null;

    return (
        <div className="space-y-3">
            {items.map((item) => (
                <EscrowCard
                    key={item.vendorOrderId}
                    orderId={orderId}
                    item={item}
                    role="vendor"
                    busyId={busyId}
                    onAction={(id, busy) => setBusyId(busy ? id : null)}
                    onChanged={() => setReloadKey((k) => k + 1)}
                />
            ))}
        </div>
    );
}

export default function VendorOrdersPage() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const accessToken = useAuthStore((s) => s.accessToken);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);

    const load = useCallback(async () => {
        try {
            const res = await api.get("/orders");
            setOrders(res.data.data || []);
        } catch (err) {
            console.error(err);
            toast.error("Could not load orders");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        const init = async () => {
            setLoading(true);
            try {
                const res = await api.get("/orders");
                if (!cancelled) setOrders(res.data.data || []);
            } catch (err) {
                if (!cancelled) {
                    console.error(err);
                    toast.error("Could not load orders");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        init();
        return () => { cancelled = true; };
    }, []);

    const advanceStatus = async (order) => {
        const next = NEXT_STATUS[order.status];
        if (!next) return;
        try {
            setUpdating(order._id);

            // The order status on the parent document is not enough for escrow:
            // a vendor updates their per-vendor fulfilment state and, once the
            // item is delivered, confirms delivery so the buyer sees the timer.
            await api.post(`/orders/${order._id}/escrow`, {
                action: "advance-fulfillment",
                nextStatus: next,
            });

            if (next === "delivered") {
                await api.post(`/orders/${order._id}/escrow`, {
                    action: "confirm-delivery",
                });
            }

            // Keep the parent order's customer-facing status in sync with the
            // vendor-specific fulfilment state displayed on this page.
            await api.patch(`/orders/${order._id}`, { status: next });

            toast.success(`Marked as ${fmt(next)}`);
            await load();
        } catch (err) {
            toast.error(err.response?.data?.message || "Update failed");
        } finally {
            setUpdating(null);
        }
    };

    const cancelOrder = async (order) => {
        if (!confirm("Cancel this order?")) return;
        try {
            setUpdating(order._id);
            await api.patch(`/orders/${order._id}`, { status: "cancelled" });
            toast.success("Order cancelled");
            await load();
        } catch (err) {
            toast.error(err.response?.data?.message || "Cancel failed");
        } finally {
            setUpdating(null);
        }
    };

    return (
        <DashboardLayout role="vendor" email={user?.email}>
            <h1 className="text-2xl font-bold">Orders & Leads</h1>
            <p className="text-sm text-gray-500 mt-1">Orders that include your products.</p>

            {loading ? (
                <div className="py-24 text-center text-sm text-gray-400 animate-pulse">Loading…</div>
            ) : orders.length === 0 ? (
                <div className="py-24 text-center text-gray-500">No orders yet.</div>
            ) : (
                <div className="mt-6 space-y-4">
                    {orders.map((o) => (
                        <article key={o._id} className="border rounded-2xl p-5 bg-white">
                            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-3 mb-3">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-widest">Order</p>
                                    <p className="font-mono text-sm">#{o._id.slice(-8).toUpperCase()}</p>
                                </div>
                                <p className="text-xs text-gray-500">{formatDate(o.createdAt)}</p>
                                <span className={`text-xs px-3 py-1 rounded-full font-bold ${STATUS_STYLES[o.status] || "bg-gray-100"}`}>
                                    {fmt(o.status)}
                                </span>
                            </header>

                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-xs font-bold uppercase text-gray-400 mb-1">Customer</p>
                                    <p>{o.shippingAddress?.fullName}</p>
                                    <p className="text-gray-500">{o.shippingAddress?.phone}</p>
                                    <p className="text-gray-500">
                                        {o.shippingAddress?.addressLine}, {o.shippingAddress?.city}, {o.shippingAddress?.state}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-gray-400 mb-1">Items from your store</p>
                                    <ul className="space-y-1">
                                        {o.items.map((it, i) => (
                                            <li key={i} className="flex justify-between">
                                                <span className="truncate">{it.productName} ×{it.quantity}</span>
                                                <span>{formatPrice(it.unitPrice * it.quantity)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {ESCROW_STATUSES.includes(o.status) && (
                                <section className="mt-4 border-t pt-4">
                                    <p className="text-xs font-bold uppercase text-gray-400 mb-2">Escrow</p>
                                    <OrderEscrow orderId={o._id} />
                                </section>
                            )}

                            <footer className="mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-sm">
                                <div>
                                    <p className="text-xs text-gray-500">Order total</p>
                                    <p className="font-bold">{formatPrice(o.total)}</p>
                                </div>
                                <div className="flex gap-2">
                                    {NEXT_STATUS[o.status] && (
                                        <button
                                            onClick={() => advanceStatus(o)}
                                            disabled={updating === o._id}
                                            className="bg-black text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
                                        >
                                            {updating === o._id ? "Updating…" : `Mark as ${fmt(NEXT_STATUS[o.status])}`}
                                        </button>
                                    )}
                                    {["pending_payment", "paid", "processing"].includes(o.status) && (
                                        <button
                                            onClick={() => cancelOrder(o)}
                                            disabled={updating === o._id}
                                            className="border px-4 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </footer>
                        </article>
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}
