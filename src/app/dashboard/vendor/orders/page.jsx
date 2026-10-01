"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuthStore } from "@/app/store/authStore";
import { api } from "@/app/lib/axios";
import { formatKobo } from "@/app/lib/money";
import { formatDate } from "@/utils/DateFormater";

const ESCROW_STYLES = {
    none: "bg-gray-100 text-gray-700",
    held: "bg-blue-100 text-blue-800",
    release_pending: "bg-amber-100 text-amber-800",
    released: "bg-green-100 text-green-800",
    disputed: "bg-red-100 text-red-800",
    refunded: "bg-purple-100 text-purple-800",
};

const FULFILLMENT_LABELS = {
    pending: "Awaiting dispatch",
    processing: "Being prepared",
    shipped: "On the way",
    delivered: "Delivered",
    cancelled: "Cancelled",
};

// Only forward steps. The server guards this too, but the UI should not offer
// an action that is guaranteed to be rejected.
const NEXT_FULFILLMENT = {
    pending: "processing",
    processing: "shipped",
    shipped: "delivered",
};

const fmt = (s) => String(s || "").replace(/_/g, " ");
const naira = (kobo) => `₦${formatKobo(kobo)}`;

export default function VendorOrdersPage() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [expanded, setExpanded] = useState({});

    const load = useCallback(async () => {
        try {
            const res = await api.get("/vendor/orders");
            setOrders(res.data.data || []);
        } catch (err) {
            console.error(err);
            if (err.response?.status === 401) {
                toast.error("Please sign in");
                router.push("/auth/sign-in");
                return;
            }
            toast.error("Could not load orders");
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        let cancelled = false;
        Promise.resolve().then(() => {
            if (!cancelled) load();
        });
        return () => { cancelled = true; };
    }, [load]);

    /**
     * Every vendor action is scoped to the vendor order, not the parent order.
     * This is what keeps one vendor's dispatch from moving another vendor's
     * slice of a shared cart.
     */
    const act = async (slice, action, extra = {}) => {
        try {
            setBusyId(slice.vendorOrderId);
            const res = await api.post(`/orders/${slice.orderId}/escrow`, {
                action,
                vendorOrderId: slice.vendorOrderId,
                ...extra,
            });
            if (res.data?.success) {
                toast.success(res.data.message || "Done");
                await load();
            } else {
                toast.error(res.data?.message || "That did not work");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const confirmDelivery = (slice) => {
        const tracking = window.prompt(
            "Delivery confirmation.\n\nAdd a tracking number (optional) and confirm you have handed the item over.",
            slice.trackingNumber || ""
        );
        // null means the vendor dismissed the prompt; "" means confirmed with
        // no tracking number. Both are valid, so only null cancels.
        if (tracking === null) return;
        act(slice, "confirm-delivery", { trackingNumber: tracking });
    };

    const showLog = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

    const openDisputes = orders.filter((o) => o.disputeStatus === "open").length;
    const awaitingConfirm = orders.filter(
        (o) => o.escrowStatus === "held" && o.vendorConfirmedDeliveryAt && !o.customerConfirmedReceiptAt
    ).length;

    return (
        <DashboardLayout role="vendor" email={user?.email}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Orders</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Each card is your slice of an order. Payments are held until delivery is
                        confirmed.
                    </p>
                </div>
                <a
                    href="/dashboard/vendor/settlements"
                    className="text-sm border rounded-md px-3 py-2 text-gray-700 hover:bg-gray-50"
                >
                    Payouts →
                </a>
            </div>

            {(awaitingConfirm > 0 || openDisputes > 0) && (
                <div className="mt-4 flex flex-wrap gap-3 text-xs">
                    {awaitingConfirm > 0 && (
                        <p className="bg-amber-50 text-amber-800 border border-amber-200 rounded-md px-3 py-2">
                            {awaitingConfirm} order(s) awaiting customer confirmation before payout
                        </p>
                    )}
                    {openDisputes > 0 && (
                        <p className="bg-red-50 text-red-800 border border-red-200 rounded-md px-3 py-2">
                            {openDisputes} order(s) disputed — payout frozen pending review
                        </p>
                    )}
                </div>
            )}

            {loading ? (
                <div className="py-24 text-center text-sm text-gray-400 animate-pulse">Loading…</div>
            ) : orders.length === 0 ? (
                <div className="py-24 text-center text-gray-500">No orders yet.</div>
            ) : (
                <div className="mt-6 space-y-4">
                    {orders.map((o) => {
                        const next = NEXT_FULFILLMENT[o.fulfillmentStatus];
                        const busy = busyId === o.vendorOrderId;

                        return (
                            <article key={o.vendorOrderId} className="border rounded-2xl p-5 bg-white">
                                <header className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-3 mb-3">
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-widest">Order</p>
                                        <p className="font-mono text-sm">
                                            #{(o.orderNo || o.orderId).slice(-8).toUpperCase()}
                                        </p>
                                    </div>
                                    <p className="text-xs text-gray-500">{formatDate(o.placedAt)}</p>
                                    <div className="flex gap-2">
                                        <span
                                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${ESCROW_STYLES[o.escrowStatus] || "bg-gray-100 text-gray-700"}`}
                                        >
                                            {fmt(o.escrowStatus)}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                                            {FULFILLMENT_LABELS[o.fulfillmentStatus] ||
                                                fmt(o.fulfillmentStatus)}
                                        </span>
                                    </div>
                                </header>

                                <div className="grid md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-xs font-bold uppercase text-gray-400 mb-1">
                                            Ship to
                                        </p>
                                        {o.shippingAddress ? (
                                            <>
                                                <p>{o.shippingAddress.fullName}</p>
                                                <p className="text-gray-500">{o.shippingAddress.phone}</p>
                                                <p className="text-gray-500">
                                                    {o.shippingAddress.addressLine},{" "}
                                                    {o.shippingAddress.city},{" "}
                                                    {o.shippingAddress.state}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-gray-400">Not available</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase text-gray-400 mb-1">
                                            Your items
                                        </p>
                                        <ul className="space-y-1">
                                            {o.items.map((it, i) => (
                                                <li key={i} className="flex justify-between gap-3">
                                                    <span className="truncate">
                                                        {it.productName} ×{it.quantity}
                                                    </span>
                                                    <span className="text-gray-500">
                                                        {naira(it.unitPrice * it.quantity)}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Money breakdown. The vendor sees the gross,
                                    the platform's cut, and their net — the fee
                                    is never silently deducted. */}
                                <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Item total</span>
                                        <span>{naira(o.grossAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-500">
                                        <span>Platform fee</span>
                                        <span>-{naira(o.platformFee)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold mt-1 pt-1 border-t">
                                        <span>You receive</span>
                                        <span>{naira(o.netAmount)}</span>
                                    </div>
                                </div>

                                {o.disputeStatus === "open" && (
                                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
                                        <p className="text-red-800 font-semibold text-xs uppercase">
                                            Dispute open
                                        </p>
                                        <p className="text-red-700 mt-1">{o.disputeReason}</p>
                                        <p className="text-red-600 text-xs mt-1">
                                            Payout is frozen until an admin reviews this.
                                        </p>
                                    </div>
                                )}

                                {o.disputeStatus === "resolved" && o.disputeResolution && (
                                    <p className="mt-3 text-xs text-gray-500">
                                        Dispute resolved: {o.disputeResolution}
                                        {o.partialRefundKobo > 0 &&
                                            ` — ${naira(o.partialRefundKobo)} refunded to the customer`}
                                    </p>
                                )}

                                <footer className="mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-sm">
                                    <div className="text-xs text-gray-500">
                                        {o.escrowStatus === "held" && o.vendorConfirmedDeliveryAt && (
                                            <p>
                                                Customer confirmation pending. Releases
                                                automatically
                                                {o.autoReleaseAt
                                                    ? ` on ${formatDate(o.autoReleaseAt)}`
                                                    : ""}
                                                .
                                            </p>
                                        )}
                                        {o.escrowStatus === "release_pending" && (
                                            <p>Queued for your next payout.</p>
                                        )}
                                        {o.escrowStatus === "released" && o.releasedAt && (
                                            <p>Paid out on {formatDate(o.releasedAt)}.</p>
                                        )}
                                        {!o.vendorConfirmedDeliveryAt && o.escrowStatus === "held" && (
                                            <p>Confirm delivery to start the payout clock.</p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => showLog(o.vendorOrderId)}
                                            className="text-xs text-gray-500 underline"
                                        >
                                            {expanded[o.vendorOrderId] ? "Hide history" : "History"}
                                        </button>

                                        {o.canAdvance && next && (
                                            <button
                                                onClick={() =>
                                                    act(o, "advance-fulfillment", { nextStatus: next })
                                                }
                                                disabled={busy}
                                                className="border px-3 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                Mark {fmt(next)}
                                            </button>
                                        )}

                                        {o.canConfirmDelivery && (
                                            <button
                                                onClick={() => confirmDelivery(o)}
                                                disabled={busy}
                                                className="bg-black text-white px-3 py-1.5 rounded-md text-sm font-semibold disabled:opacity-50"
                                            >
                                                {busy ? "Saving…" : "Confirm delivery"}
                                            </button>
                                        )}
                                    </div>
                                </footer>

                                {expanded[o.vendorOrderId] && (
                                    <ol className="mt-3 border-t pt-3 space-y-1.5 text-xs text-gray-500">
                                        {(o.statusLog || [])
                                            .slice()
                                            .reverse()
                                            .map((entry, i) => (
                                                <li key={i} className="flex gap-2">
                                                    <span className="font-mono text-gray-400 shrink-0">
                                                        {formatDate(entry.at)}
                                                    </span>
                                                    <span className="text-gray-700">{entry.event}</span>
                                                    <span className="text-gray-400 ml-auto shrink-0">
                                                        {entry.by}
                                                    </span>
                                                </li>
                                            ))}
                                    </ol>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}
        </DashboardLayout>
    );
}
