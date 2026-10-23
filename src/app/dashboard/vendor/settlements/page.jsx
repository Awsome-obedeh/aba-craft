"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/MetricCard";
import { useAuthStore } from "@/app/store/authStore";
import { api } from "@/app/lib/axios";
import { formatKobo } from "@/app/lib/money";
import { formatDate } from "@/utils/DateFormater";

const naira = (kobo) => `₦${formatKobo(kobo)}`;
const fmt = (s) => String(s || "").replace(/_/g, " ");

const SETTLEMENT_STYLES = {
    pending: "bg-gray-100 text-gray-700",
    processing: "bg-amber-100 text-amber-800",
    paid: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-gray-200 text-gray-600",
};

export default function VendorSettlementsPage() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const [data, setData] = useState(null);
    const [recipient, setRecipient] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const res = await api.get("/vendor/settlements");
            setData(res.data.data || null);
        } catch (err) {
            console.error(err);
            if (err.response?.status === 401) {
                router.push("/auth/sign-in");
                return;
            }
            toast.error("Could not load your payouts");
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        let cancelled = false;
        Promise.resolve().then(() => {
            if (cancelled) return;
            load();
            api
                .get("/vendor/recipient")
                .then((r) => {
                    if (!cancelled) setRecipient(r.data?.data || null);
                })
                .catch(() => {
                    if (!cancelled) setRecipient(null);
                });
        });
        return () => { cancelled = true; };
    }, [load]);

    // A vendor with money owed but no payout account cannot be paid, so this
    // is the single most actionable thing on the page.
    const needsPayoutAccount = !recipient && (data?.availableToWithdraw?.kobo > 0);

    return (
        <DashboardLayout role="vendor" email={user?.email}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Payouts</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        What you have earned, what is still protected, and what has been paid.
                    </p>
                </div>
                <a
                    href="/dashboard/vendor/orders"
                    className="text-sm border rounded-md px-3 py-2 text-gray-700 hover:bg-gray-50"
                >
                    ← Orders
                </a>
            </div>

            {needsPayoutAccount && (
                <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-semibold">Add a payout account to receive your money.</p>
                    <p className="mt-1 text-amber-800">
                        You have {naira(data.availableToWithdraw.kobo)} ready, but payouts cannot be
                        sent without a bank account on file.
                    </p>
                    <a
                        href="/dashboard/vendor/payout-account"
                        className="inline-block mt-2 bg-amber-900 text-white px-3 py-1.5 rounded-md text-xs font-semibold"
                    >
                        Set up payout account
                    </a>
                </div>
            )}

            {loading ? (
                <div className="py-24 text-center text-sm text-gray-400 animate-pulse">Loading…</div>
            ) : !data ? (
                <div className="py-24 text-center text-gray-500">No payout data yet.</div>
            ) : (
                <>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <MetricCard
                            title="Ready for payout"
                            value={naira(data.availableToWithdraw.kobo)}
                            subtext={`${data.availableToWithdraw.count} order(s) cleared`}
                        />
                        <MetricCard
                            title="Held in escrow"
                            value={naira(data.held.kobo)}
                            subtext={`${data.held.count} order(s) in progress`}
                        />
                        <MetricCard
                            title="Disputed"
                            value={naira(data.disputed.kobo)}
                            subtext={`${data.disputed.count} frozen pending review`}
                        />
                        <MetricCard
                            title="Paid out"
                            value={naira(data.settled.kobo)}
                            subtext={`${data.settled.count} order(s) settled`}
                        />
                    </div>

                    <section className="mt-8">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
                            Payout history
                        </h2>
                        {data.settlements.length === 0 ? (
                            <p className="py-8 text-sm text-gray-500">
                                No payouts yet. Funds appear here once an order clears.
                            </p>
                        ) : (
                            <ul className="mt-3 space-y-2">
                                {data.settlements.map((s) => (
                                    <li
                                        key={s._id}
                                        className="border rounded-xl p-4 bg-white flex flex-wrap items-center justify-between gap-3"
                                    >
                                        <div>
                                            <p className="font-mono text-xs text-gray-400">
                                                {s.transferReference || s._id}
                                            </p>
                                            <p className="text-sm mt-0.5">
                                                {naira(s.amountSent)} to{" "}
                                                {recipient?.accountName || "your bank account"}
                                            </p>
                                            {s.paystackFee > 0 && (
                                                <p className="text-xs text-gray-500">
                                                    Transfer fee {naira(s.paystackFee)} deducted
                                                </p>
                                            )}
                                            {s.failureReason && (
                                                <p className="text-xs text-red-600">
                                                    Failed: {s.failureReason}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span
                                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${SETTLEMENT_STYLES[s.status] || "bg-gray-100 text-gray-700"}`}
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
                    </section>
                </>
            )}
        </DashboardLayout>
    );
}
