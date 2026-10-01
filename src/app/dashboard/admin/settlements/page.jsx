"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/MetricCard";
import { useAuthStore } from "@/app/store/authStore";
import { api } from "@/app/lib/axios";
import { formatKobo } from "@/app/lib/money";
import { formatDate } from "@/utils/DateFormater";

const naira = (kobo) => `₦${formatKobo(kobo)}`;
const fmt = (s) => String(s || "").replace(/_/g, " ");

const STATUS_STYLES = {
    pending: "bg-gray-100 text-gray-700",
    processing: "bg-amber-100 text-amber-800",
    paid: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-gray-200 text-gray-600",
};

const SETTLEMENT_TABS = ["open disputes", "stuck payouts", "recent payouts", "ledger"];

/** Resolve one dispute: full release, full refund, or a partial split. */
function ResolvePanel({ dispute, onDone }) {
    const [mode, setMode] = useState("release");
    const [refundNaira, setRefundNaira] = useState("");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    const escrowNaira = dispute.netAmount / 100;
    const pct = Number(refundNaira) > 0 ? Math.min(100, (Number(refundNaira) / escrowNaira) * 100) : 0;

    const submit = async () => {
        const body = { resolution: mode, note };
        if (mode === "partial") {
            if (!Number(refundNaira) || Number(refundNaira) <= 0) {
                toast.error("Enter the amount to refund");
                return;
            }
            if (Number(refundNaira) >= escrowNaira) {
                toast.error("That is the full amount — use Refund instead");
                return;
            }
            // Sent as naira; the server converts to exact kobo.
            body.refundAmount = Number(refundNaira);
        }

        if (mode === "refund" && !window.confirm(`Refund the full ${naira(dispute.netAmount)} to the customer?`)) {
            return;
        }

        try {
            setBusy(true);
            const res = await api.post(
                `/admin/settlements/disputes/${dispute._id}/resolve`,
                body
            );
            if (res.data?.success) {
                toast.success(res.data.message || "Dispute resolved");
                setNote("");
                setRefundNaira("");
                onDone();
            } else {
                toast.error(res.data?.message || "Could not resolve");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Something went wrong");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mt-3 rounded-lg border bg-gray-50 p-3 space-y-3">
            <div className="flex flex-wrap gap-2">
                {[
                    { key: "release", label: "Release to vendor" },
                    { key: "refund", label: "Refund customer" },
                    { key: "partial", label: "Partial split" },
                ].map((o) => (
                    <button
                        key={o.key}
                        onClick={() => setMode(o.key)}
                        className={`text-xs px-3 py-1.5 rounded-md font-semibold border ${
                            mode === o.key
                                ? "bg-black text-white border-black"
                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                    >
                        {o.label}
                    </button>
                ))}
            </div>

            {mode === "partial" && (
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Refund amount (₦) — vendor receives the rest
                    </label>
                    <input
                        value={refundNaira}
                        onChange={(e) => setRefundNaira(e.target.value)}
                        inputMode="decimal"
                        placeholder={String(escrowNaira)}
                        className="w-full max-w-[12rem] rounded-md border border-gray-300 p-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    {Number(refundNaira) > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                            Refund {naira(Math.round(Number(refundNaira) * 100))} · vendor gets{" "}
                            {naira(dispute.netAmount - Math.round(Number(refundNaira) * 100))} (
                            {Math.round(100 - pct)}%)
                        </p>
                    )}
                </div>
            )}

            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Note (optional, recorded on the audit trail)
                </label>
                <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. item arrived damaged; agreed 50% refund with vendor"
                    className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
            </div>

            <button
                onClick={submit}
                disabled={busy}
                className="bg-black text-white px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50"
            >
                {busy ? "Working…" : "Confirm resolution"}
            </button>
        </div>
    );
}

export default function AdminSettlementsPage() {
    const user = useAuthStore((s) => s.user);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState(SETTLEMENT_TABS[0]);
    const [resolving, setResolving] = useState(null);

    const load = useCallback(async () => {
        try {
            const res = await api.get("/admin/settlements");
            setData(res.data.data || null);
        } catch (err) {
            console.error(err);
            toast.error("Could not load escrow data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        Promise.resolve().then(() => {
            if (!cancelled) load();
        });
        return () => { cancelled = true; };
    }, [load]);

    const retrySettlement = async (s) => {
        try {
            const res = await api.post("/admin/settlements", { action: "retry", id: s._id });
            if (res.data?.success) {
                toast.success("Payout queued for retry");
                load();
            } else {
                toast.error(res.data?.message || "Could not retry");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not retry payout");
        }
    };

    return (
        <DashboardLayout role="admin" email={user?.email}>
            <h1 className="text-2xl font-bold">Escrow &amp; payouts</h1>
            <p className="text-sm text-gray-500 mt-1">
                Money held for vendors, disputes awaiting a decision, and ledger balances.
            </p>

            {loading ? (
                <div className="py-24 text-center text-sm text-gray-400 animate-pulse">Loading…</div>
            ) : !data ? (
                <div className="py-24 text-center text-gray-500">No data.</div>
            ) : (
                <>
                    {/* A shortfall is the most urgent thing on this page: we have
                        promised vendors money the account does not contain, so
                        the next payout attempt will fail. */}
                    {data.liveBalance?.ok && !data.liveBalance.covered && (
                        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
                            <p className="font-semibold">Paystack balance does not cover vendor payouts</p>
                            <p className="mt-1 text-red-800">
                                We owe vendors {naira(data.liveBalance.vendorPayableKobo)} but only{" "}
                                {naira(data.liveBalance.liveBalanceKobo)} is in the Paystack account — a
                                shortfall of{" "}
                                <strong>{naira(Math.abs(data.liveBalance.headroomKobo))}</strong>. Pause
                                payouts and top up before the next settlement run.
                            </p>
                        </div>
                    )}
                    {data.liveBalance?.ok && data.liveBalance.covered && (
                        <p className="mt-4 text-xs text-gray-500">
                            Paystack balance{" "}
                            <span className="font-semibold text-gray-700">
                                {naira(data.liveBalance.liveBalanceKobo)}
                            </span>{" "}
                            covers vendor payouts of{" "}
                            {naira(data.liveBalance.vendorPayableKobo)} with{" "}
                            {naira(data.liveBalance.headroomKobo)} headroom.
                        </p>
                    )}

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <MetricCard
                            title="Held in escrow"
                            value={naira(data.headline.heldKobo)}
                            subtext="Owed to vendors, not yet released"
                        />
                        <MetricCard
                            title="Disputed"
                            value={naira(data.headline.disputedKobo)}
                            subtext={`${data.openDisputes.length} awaiting decision`}
                        />
                        <MetricCard
                            title="Platform fees"
                            value={naira(data.headline.platformFeesKobo)}
                            subtext="Commission earned to date"
                        />
                        <MetricCard
                            title="Paid out"
                            value={naira(data.settlementsByStatus.paid?.amountKobo || 0)}
                            subtext="Transferred to vendors"
                        />
                    </div>

                    <div className="mt-8 flex flex-wrap gap-2 border-b">
                        {SETTLEMENT_TABS.map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`px-3 py-2 text-sm border-b-2 -mb-px ${
                                    tab === t
                                        ? "border-black text-black font-semibold"
                                        : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                {t}
                                {t === "open disputes" && data.openDisputes.length > 0 && (
                                    <span className="ml-1.5 bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full">
                                        {data.openDisputes.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="mt-5">
                        {tab === "open disputes" &&
                            (data.openDisputes.length === 0 ? (
                                <p className="py-8 text-sm text-gray-500">No open disputes.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {data.openDisputes.map((d) => (
                                        <li key={d._id} className="border rounded-xl p-4 bg-white">
                                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                <div>
                                                    <p className="font-mono text-xs text-gray-400">
                                                        Order #{String(d.orderId?._id || d.orderId).slice(-8).toUpperCase()}
                                                    </p>
                                                    <p className="text-sm mt-0.5">
                                                        {d.vendorId?.fullName || "Vendor"} —{" "}
                                                        {naira(d.netAmount)} held
                                                    </p>
                                                </div>
                                                <p className="text-xs text-gray-400">
                                                    {formatDate(d.disputedAt)}
                                                </p>
                                            </div>
                                            <p className="mt-2 text-sm text-gray-700 border-l-2 border-red-200 pl-3">
                                                {d.disputeReason}
                                            </p>
                                            {resolving === d._id ? (
                                                <ResolvePanel
                                                    dispute={d}
                                                    onDone={() => {
                                                        setResolving(null);
                                                        load();
                                                    }}
                                                />
                                            ) : (
                                                <button
                                                    onClick={() => setResolving(d._id)}
                                                    className="mt-3 text-xs bg-black text-white px-3 py-1.5 rounded-md font-semibold"
                                                >
                                                    Resolve dispute
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ))}

                        {tab === "stuck payouts" &&
                            (data.stuckSettlements.length === 0 ? (
                                <p className="py-8 text-sm text-gray-500">
                                    No stuck payouts. Everything transferred cleanly.
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {data.stuckSettlements.map((s) => (
                                        <li
                                            key={s._id}
                                            className="border border-red-200 rounded-xl p-4 bg-white flex flex-wrap items-center justify-between gap-3"
                                        >
                                            <div>
                                                <p className="text-sm font-semibold">
                                                    {s.vendorId?.fullName || "Vendor"} —{" "}
                                                    {naira(s.netAmount)}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {s.transferReference || s._id} · {s.attempts} attempt(s)
                                                </p>
                                                {s.failureReason && (
                                                    <p className="text-xs text-red-600 mt-0.5">
                                                        {s.failureReason}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => retrySettlement(s)}
                                                className="text-xs border rounded-md px-3 py-1.5 hover:bg-gray-50"
                                            >
                                                Retry payout
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ))}

                        {tab === "recent payouts" && (
                            <ul className="space-y-2">
                                {data.recentSettlements.length === 0 && (
                                    <p className="py-8 text-sm text-gray-500">No payouts yet.</p>
                                )}
                                {data.recentSettlements.map((s) => (
                                    <li
                                        key={s._id}
                                        className="border rounded-xl p-4 bg-white flex flex-wrap items-center justify-between gap-3"
                                    >
                                        <div>
                                            <p className="text-sm">
                                                {s.vendorId?.fullName || "Vendor"} —{" "}
                                                {naira(s.netAmount)}
                                            </p>
                                            <p className="text-xs text-gray-400 font-mono">
                                                {s.transferReference || s._id}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span
                                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${STATUS_STYLES[s.status] || "bg-gray-100"}`}
                                            >
                                                {fmt(s.status)}
                                            </span>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {formatDate(s.processedAt || s.createdAt)}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {tab === "ledger" && (
                            <>
                                <p className="text-xs text-gray-500 mb-3">
                                    Every entry is balanced, so each account should be explainable
                                    from the events behind it.
                                </p>
                                <ul className="space-y-2">
                                    {data.ledgerBalances.map((a) => (
                                        <li
                                            key={a.code}
                                            className="border rounded-xl p-4 bg-white flex flex-wrap items-center justify-between gap-3"
                                        >
                                            <div>
                                                <p className="text-sm font-mono font-semibold">
                                                    {a.code}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {a.label}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold">{naira(a.balance)}</p>
                                                <p className="text-xs text-gray-400">
                                                    {a.debits} debit(s) · {a.credits} credit(s)
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                </>
            )}
        </DashboardLayout>
    );
}
