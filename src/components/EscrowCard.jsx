"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import useCountdown from "@/app/hooks/useCountdown";
import { api } from "@/app/lib/axios";
import { formatKobo } from "@/app/lib/money";

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

const label = (s) => String(s || "").replace(/_/g, " ");

function Countdown({ targetMs, onDispute, disabled }) {
    const c = useCountdown(targetMs);
    if (!c) return null;

    if (c.expired) {
        return (
            <p className="text-xs text-gray-500">
                The confirmation window has closed — the payment has been released to the vendor.
            </p>
        );
    }

    return (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="text-xs text-amber-800 leading-relaxed">
                Unless you confirm receipt, this payment is released to the vendor automatically in
            </p>
            <p
                className={`font-mono text-2xl font-bold mt-1 ${
                    c.urgent ? "text-red-600" : "text-amber-700"
                }`}
            >
                {c.days > 0 && <span>{c.days}d </span>}
                <span>{String(c.hours).padStart(2, "0")}h </span>
                <span>{String(c.minutes).padStart(2, "0")}m </span>
                <span>{String(c.seconds).padStart(2, "0")}s</span>
            </p>
            {c.urgent && (
                <p className="text-xs text-red-600 font-medium mt-1">
                    Less than a day left. Open a dispute now if there is a problem.
                </p>
            )}
            {onDispute && (
                <button
                    onClick={onDispute}
                    disabled={disabled}
                    className="mt-2 text-xs underline text-red-700 disabled:opacity-50"
                >
                    Report a problem
                </button>
            )}
        </div>
    );
}

function DisputeForm({ orderId, vendorOrderId, onDone, onCancel }) {
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (reason.trim().length < 10) {
            toast.error("Please describe the problem in a little more detail");
            return;
        }
        try {
            setBusy(true);
            const res = await api.post(`/orders/${orderId}/escrow`, {
                action: "dispute",
                vendorOrderId,
                note: reason.trim(),
            });
            if (res.data?.success) {
                toast.success("Dispute opened. The payment is frozen while we review it.");
                onDone();
            } else {
                toast.error(res.data?.message || "Could not open dispute");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not open dispute");
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
            <label className="block text-xs font-semibold text-red-800">
                What is wrong with this order?
            </label>
            <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Item never arrived, wrong item sent, damaged…"
                className="w-full rounded-md border border-red-200 p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={busy}
                    className="bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50"
                >
                    {busy ? "Opening…" : "Open dispute"}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="text-xs text-gray-600 px-2 py-1.5"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}

export default function EscrowCard({ orderId, item, onChanged, role = "customer", busyId, onAction }) {
    const [disputing, setDisputing] = useState(false);
    const busy = busyId === item.vendorOrderId;

    const act = async (action, extra = {}) => {
        try {
            onAction?.(item.vendorOrderId, true);
            const res = await api.post(`/orders/${orderId}/escrow`, {
                action,
                vendorOrderId: item.vendorOrderId,
                ...extra,
            });
            if (res.data?.success) {
                toast.success(res.data.message || "Done");
                onChanged?.();
            } else {
                toast.error(res.data?.message || "That did not work");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Something went wrong");
        } finally {
            onAction?.(item.vendorOrderId, false);
        }
    };

    return (
        <div className="border-l-4 border-gray-200 pl-4 py-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${ESCROW_STYLES[item.escrowStatus] || "bg-gray-100 text-gray-700"}`}>
                    {label(item.escrowStatus)}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                    {FULFILLMENT_LABELS[item.fulfillmentStatus] || label(item.fulfillmentStatus)}
                </span>
                {item.vendor?.businessName && (
                    <span className="text-[10px] text-gray-500">{item.vendor.businessName}</span>
                )}
            </div>

            {item.vendorConfirmedDeliveryAt && !item.customerConfirmedReceiptAt && item.escrowStatus === "held" && (
                <Countdown
                    targetMs={item.autoReleaseAt ? new Date(item.autoReleaseAt).getTime() : null}
                    onDispute={role === "customer" ? () => setDisputing(true) : undefined}
                    disabled={busy}
                />
            )}

            {item.customerConfirmedReceiptAt && item.escrowStatus === "held" && (
                <p className="text-xs text-gray-500">
                    You confirmed receipt. Waiting on {item.vendor?.businessName || "the vendor"} to
                    confirm dispatch.
                </p>
            )}

            {item.escrowStatus === "disputed" && (
                <p className="text-xs text-red-700">
                    Dispute open — the payment is frozen until an admin reviews it.
                </p>
            )}

            {item.partialRefundKobo > 0 && (
                <p className="text-xs text-purple-700">
                    Partially refunded: ₦{formatKobo(item.partialRefundKobo)}
                </p>
            )}

            {role === "customer" && item.canConfirmReceipt && (
                <button
                    onClick={() => act("confirm-receipt")}
                    disabled={busy}
                    className="mt-2 bg-black text-white px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50"
                >
                    {busy ? "Confirming…" : "Confirm I received this"}
                </button>
            )}

            {disputing && (
                <DisputeForm
                    orderId={orderId}
                    vendorOrderId={item.vendorOrderId}
                    onDone={() => {
                        setDisputing(false);
                        onChanged?.();
                    }}
                    onCancel={() => setDisputing(false)}
                />
            )}
        </div>
    );
}
