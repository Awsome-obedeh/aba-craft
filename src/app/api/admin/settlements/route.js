// GET /api/admin/settlements
//
// Platform-level escrow view: how much is held, how much is queued for payout,
// what has failed, and which disputes need a decision.
//
// Every number is derived from the ledger and the vendor orders, never from
// order totals directly, so the dashboard and the ledger cannot disagree.

import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import VendorOrder, { ESCROW } from "@/models/VendorOrder";
import Settlement from "@/models/Settlement";
import { NextResponse } from "next/server";
import { koboToNaira } from "@/app/lib/money";
import { getAccountBalances } from "@/app/lib/ledger";
import { paystackRequest } from "@/app/lib/paystack";
import { ACCOUNT_CODES } from "@/models/Account";

export const dynamic = "force-dynamic";

export async function GET(req) {
    const auth = await verifyAuth(req, ["admin"]);
    if (!auth.isValid) {
        return NextResponse.json(
            { success: false, message: auth.message },
            { status: auth.status }
        );
    }

    try {
        await connectDB();

        // How much vendor money is currently held, queued, or paid out.
        const byEscrow = await VendorOrder.aggregate([
            {
                $group: {
                    _id: "$escrowStatus",
                    amount: { $sum: "$netAmount" },
                    fees: { $sum: "$platformFee" },
                    count: { $sum: 1 },
                },
            },
        ]);

        const escrow = {};
        for (const row of byEscrow) {
            escrow[row._id] = {
                netKobo: row.amount,
                feesKobo: row.fees,
                netNaira: koboToNaira(row.amount),
                count: row.count,
            };
        }

        const settlementCounts = await Settlement.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$netAmount" } } },
        ]);

        const settlementsByStatus = {};
        for (const row of settlementCounts) {
            settlementsByStatus[row._id] = {
                count: row.count,
                amountKobo: row.amount,
                amountNaira: koboToNaira(row.amount),
            };
        }

        // Open disputes are the items needing a human decision.
        const openDisputes = await VendorOrder.find({
            disputeStatus: "open",
        })
            .populate("orderId", "total status")
            .populate("vendorId", "fullName email")
            .sort({ disputedAt: -1 })
            .limit(50)
            .lean();

        // Settlements that exhausted their retries and need manual help.
        const stuckSettlements = await Settlement.find({
            $or: [{ status: "failed", nextRetryAt: null }, { status: "failed" }],
        })
            .populate("vendorId", "fullName email")
            .sort({ updatedAt: -1 })
            .limit(50)
            .lean();

        const recentSettlements = await Settlement.find({})
            .populate("vendorId", "fullName email")
            .sort({ createdAt: -1 })
            .limit(25)
            .lean();

        const balances = await getAccountBalances();

        // Live Paystack balance vs. what we owe vendors. This is the check that
        // catches "we promised money we cannot actually send", so the admin
        // dashboard surfaces it prominently rather than hiding it in a job log.
        let liveBalance;
        try {
            const bal = await paystackRequest("/balance", { method: "GET" });
            const ngn = bal.data?.data?.find?.((b) => b.currency === "NGN");
            if (bal.ok && ngn) {
                const owedKobo =
                    balances.find((b) => b.code === ACCOUNT_CODES.VENDOR_PAYABLE)?.balance || 0;
                liveBalance = {
                    ok: true,
                    liveBalanceKobo: ngn.balance,
                    vendorPayableKobo: owedKobo,
                    headroomKobo: ngn.balance - owedKobo,
                    covered: ngn.balance >= owedKobo,
                };
            } else {
                liveBalance = { ok: false, message: bal.data?.message || "Unavailable" };
            }
        } catch (e) {
            liveBalance = { ok: false, message: "Could not reach Paystack" };
        }

        return NextResponse.json({
            success: true,
            data: {
                escrow,
                headline: {
                    heldKobo: escrow[ESCROW.HELD]?.netKobo || 0,
                    heldNaira: koboToNaira(escrow[ESCROW.HELD]?.netKobo || 0),
                    pendingReleaseKobo:
                        (escrow[ESCROW.RELEASE_PENDING]?.netKobo || 0) + (escrow[ESCROW.RELEASED]?.netKobo || 0),
                    disputedKobo: escrow[ESCROW.DISPUTED]?.netKobo || 0,
                    platformFeesKobo: Object.values(escrow).reduce((s, r) => s + r.feesKobo, 0),
                },
                settlementsByStatus,
                openDisputes,
                stuckSettlements,
                recentSettlements,
                liveBalance,
                ledgerBalances: balances.map((a) => ({
                    ...a,
                    balanceNaira: koboToNaira(a.balance),
                })),
            },
        });
    } catch (error) {
        console.error("ADMIN SETTLEMENTS ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}

// POST /api/admin/settlements
//
//   { action: "retry", id }  re-queue a failed payout
//
// A failed transfer is not the end of the road: bank outages and stale recipient
// codes are both transient in practice. This resets the retry budget so the
// settlement job picks it up again, and records who asked so the audit trail
// shows the payout was manually revived.
export async function POST(req) {
    const auth = await verifyAuth(req, ["admin"]);
    if (!auth.isValid) {
        return NextResponse.json(
            { success: false, message: auth.message },
            { status: auth.status }
        );
    }

    try {
        await connectDB();

        const { action, id } = await req.json().catch(() => ({}));

        if (action !== "retry") {
            return NextResponse.json(
                { success: false, message: "Unknown action" },
                { status: 400 }
            );
        }
        if (!id) {
            return NextResponse.json(
                { success: false, message: "id is required" },
                { status: 400 }
            );
        }

        // Only a failed settlement can be retried. Retrying a paid one would
        // risk a duplicate transfer.
        const updated = await Settlement.findOneAndUpdate(
            { _id: id, status: "failed" },
            {
                $set: {
                    status: "pending",
                    attempts: 0,
                    nextRetryAt: new Date(),
                    failureReason: "",
                    triggeredBy: `admin:${auth.user.id}`,
                },
                $push: { statusLog: { at: new Date(), event: "manual_retry", by: String(auth.user.id) } },
            },
            { new: true }
        );

        if (!updated) {
            return NextResponse.json(
                { success: false, message: "Settlement not found, or it is not in a failed state" },
                { status: 409 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Payout re-queued — it will be picked up by the settlement job",
            data: updated,
        });
    } catch (error) {
        console.error("ADMIN SETTLEMENT RETRY ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Server error retrying payout" },
            { status: 500 }
        );
    }
}
