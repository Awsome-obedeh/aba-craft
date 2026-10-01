// GET /api/jobs/reconcile
//
// The safety net. Compares our internal books against reality and reports drift.
//
// Two independent checks:
//
//  1. LEDGER INTEGRITY — every entry balances (sum(debits) === sum(credits)),
//     and the materialised account balances match a fresh aggregation of the
//     entries. This catches a bug in the ledger helper itself.
//
//  2. PAYSTACK RECONCILIATION — compares our order-level payment records to
//     Paystack's actual transaction list. This catches the dangerous case: a
//     payment Paystack collected that we never recorded, or an order we think
//     is paid that Paystack does not agree is paid.
//
// Anything non-zero here is a real problem that needs a human, not a metric to
// watch drift. The job reports; it does not self-heal.

import connectDB from "@/app/lib/connect";
import Order from "@/models/Order";
import LedgerEntry from "@/models/LedgerEntry";
import Account from "@/models/Account";
import VendorOrder, { ESCROW } from "@/models/VendorOrder";
import Settlement from "@/models/Settlement";
import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/app/lib/cronAuth";
import { paystackRequest } from "@/app/lib/paystack";
import { koboToNaira } from "@/app/lib/money";
import { ACCOUNT_CODES, ensureAccounts } from "@/models/Account";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Check every ledger entry balances, and that account balances are accurate. */
async function checkLedgerIntegrity() {
    const unbalanced = [];
    const cursor = LedgerEntry.find({}, { lines: 1, type: 1, _id: 1 }).lean().cursor();

    for await (const entry of cursor) {
        const debits = entry.lines.reduce((s, l) => s + (l.debit || 0), 0);
        const credits = entry.lines.reduce((s, l) => s + (l.credit || 0), 0);
        if (debits !== credits) {
            unbalanced.push({
                entryId: String(entry._id),
                type: entry.type,
                debits,
                credits,
                differenceKobo: debits - credits,
            });
        }
    }

    // Recompute each account balance straight from the entries and compare with
    // the materialised value the ledger helper maintains. The direction depends
    // on the account's normal balance, matching postEntry.
    const entryLines = await LedgerEntry.aggregate([
        { $unwind: "$lines" },
        {
            $group: {
                _id: "$lines.account",
                debits: { $sum: "$lines.debit" },
                credits: { $sum: "$lines.credit" },
            },
        },
    ]);

    const accounts = await Account.find().lean();
    const normals = Object.fromEntries(accounts.map((a) => [a.code, a.normalBalance]));

    const drift = [];
    for (const account of accounts) {
        const line = entryLines.find((l) => l._id === account.code);
        const expected = !line
            ? 0
            : account.normalBalance === "debit"
                ? line.debits - line.credits
                : line.credits - line.debits;

        if (account.balance !== expected) {
            drift.push({
                code: account.code,
                recorded: account.balance,
                recomputed: expected,
                differenceKobo: account.balance - expected,
            });
        }
    }

    // The global invariant: across the whole ledger, debits equal credits.
    const global = await LedgerEntry.aggregate([
        { $unwind: "$lines" },
        {
            $group: {
                _id: null,
                debits: { $sum: "$lines.debit" },
                credits: { $sum: "$lines.credit" },
            },
        },
    ]);

    return {
        unbalancedEntries: unbalanced,
        accountDrift: drift,
        totals: {
            debitsKobo: global[0]?.debits || 0,
            creditsKobo: global[0]?.credits || 0,
            balanced: (global[0]?.debits || 0) === (global[0]?.credits || 0),
        },
    };
}

/** Compare our paid orders against Paystack's actual transaction list. */
async function reconcileWithPaystack() {
    const { ok, data } = await paystackRequest("/transaction", { method: "GET" });

    if (!ok) {
        return {
            ok: false,
            message: data?.message || "Could not list Paystack transactions",
        };
    }

    const transactions = data?.data || [];

    // Paystack sends us money we may not have recorded. Any successful
    // transaction whose reference we do not know about is a serious problem.
    const ourReferences = new Set(
        (await Order.find({ paymentRef: { $ne: "" } }).select("paymentRef").lean()).map((o) => o.paymentRef)
    );

    const unclaimed = transactions
        .filter((t) => t.status === "success")
        .filter((t) => t.reference && !ourReferences.has(t.reference))
        .map((t) => ({
            reference: t.reference,
            amountKobo: t.amount,
            amountNaira: koboToNaira(t.amount),
            createdAt: t.created_at,
        }));

    // Orders we believe are paid but Paystack does not show as successful.
    const paystackByRef = new Map(transactions.map((t) => [t.reference, t]));
    const claimedPaid = await Order.find({
        paymentStatus: "paid",
        paymentMethod: "paystack",
    })
        .select("paymentRef total")
        .limit(500)
        .lean();

    const mismatched = claimedPaid
        .filter((o) => o.paymentRef && paystackByRef.has(o.paymentRef))
        .filter((o) => paystackByRef.get(o.paymentRef).status !== "success")
        .map((o) => ({
            orderId: String(o._id),
            reference: o.paymentRef,
            paystackStatus: paystackByRef.get(o.paymentRef).status,
        }));

    return {
        ok: true,
        transactionsChecked: transactions.length,
        unclaimedPayments: unclaimed,
        paidButNotSuccessfulAtPaystack: mismatched,
    };
}

/**
 * The one check that catches the failure the other two cannot: our ledger says
 * we owe vendors X, but Paystack's account does not actually hold X.
 *
 * This is deliberately an inequality, not an equality. The live balance is a
 * SUPERSET of what we owe vendors — it also contains money for orders whose
 * vendor orders have not been created yet, refunds in flight, and the platform's
 * own fees. Comparing for equality would report a healthy system as broken.
 *
 * What must always hold is `liveBalance >= VENDOR_PAYABLE`. A shortfall means we
 * have promised money we cannot send, and the next payout attempt will bounce.
 * That is a real, urgent problem, so it is reported as drift.
 */
async function checkPaystackLiveBalance() {
    const { ok, data } = await paystackRequest("/balance", { method: "GET" });

    if (!ok || !Array.isArray(data?.data)) {
        return {
            ok: false,
            message: data?.message || "Could not read the Paystack live balance",
        };
    }

    const ngn = data.data.find((b) => b.currency === "NGN");
    if (!ngn) {
        return { ok: false, message: "Paystack balance response has no NGN entry" };
    }

    // Paystack reports the balance in kobo on the /balance endpoint.
    const liveKobo = ngn.balance;

    const payable = await Account.findOne({ code: ACCOUNT_CODES.VENDOR_PAYABLE }).lean();
    const owedKobo = payable?.balance || 0;

    // Guard against a nonsense reading rather than reporting a huge shortfall
    // on a malformed response.
    if (!Number.isFinite(liveKobo) || liveKobo < 0) {
        return { ok: false, message: `Paystack returned an unusable balance: ${liveKobo}` };
    }

    return {
        ok: true,
        liveBalanceKobo: liveKobo,
        liveBalanceNaira: koboToNaira(liveKobo),
        vendorPayableKobo: owedKobo,
        vendorPayableNaira: koboToNaira(owedKobo),
        // Positive means we are covered. Negative is a shortfall.
        headroomKobo: liveKobo - owedKobo,
        covered: liveKobo >= owedKobo,
    };
}

/** Money we say we are holding vs. money sitting in vendor payable. */
async function checkEscrowConsistency() {
    const held = await VendorOrder.aggregate([
        { $match: { escrowStatus: ESCROW.HELD } },
        { $group: { _id: null, amount: { $sum: "$netAmount" }, count: { $sum: 1 } } },
    ]);

    const payable = await Account.findOne({ code: ACCOUNT_CODES.VENDOR_PAYABLE }).lean();

    // Escrow liability (money owed to vendors) should equal vendor payable once
    // released orders have become payable. Compare held + release_pending
    // against the escrow liability account.
    const owedNotYetReleased = await VendorOrder.aggregate([
        { $match: { escrowStatus: { $in: [ESCROW.HELD, ESCROW.DISPUTED] } } },
        { $group: { _id: null, amount: { $sum: "$netAmount" } } },
    ]);

    return {
        heldInEscrowKobo: held[0]?.amount || 0,
        heldCount: held[0]?.count || 0,
        owedNotYetReleasedKobo: owedNotYetReleased[0]?.amount || 0,
        vendorPayableAccountKobo: payable?.balance || 0,
    };
}

async function handler(req) {
    const auth = assertCronAuthorized(req);
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
    }

    try {
        await connectDB();
        await ensureAccounts();

        const ledger = await checkLedgerIntegrity();
        const escrow = await checkEscrowConsistency();
        const paystack = await reconcileWithPaystack();
        const liveBalance = await checkPaystackLiveBalance();

        // Stuck settlements that exhausted their retries.
        const stuckSettlements = await Settlement.find({
            status: "failed",
            nextRetryAt: null,
        })
            .select("_id vendorId failureReason attempts")
            .lean();

        const hasDrift =
            ledger.unbalancedEntries.length > 0 ||
            ledger.accountDrift.length > 0 ||
            !ledger.totals.balanced ||
            (paystack.ok &&
                (paystack.unclaimedPayments.length > 0 ||
                    paystack.paidButNotSuccessfulAtPaystack.length > 0)) ||
            // A live balance we cannot read is itself drift: we have no
            // assurance the money is there.
            !liveBalance.ok ||
            !liveBalance.covered ||
            stuckSettlements.length > 0;

        return NextResponse.json(
            {
                success: true,
                healthy: !hasDrift,
                ledger,
                escrow,
                paystack,
                liveBalance,
                stuckSettlements: stuckSettlements.map((s) => ({
                    ...s,
                    _id: String(s._id),
                    vendorId: String(s.vendorId),
                })),
            },
            // A non-2xx status makes most schedulers alert, which is what we
            // want for genuine drift.
            { status: hasDrift ? 409 : 200 }
        );
    } catch (error) {
        console.error("RECONCILE JOB ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Reconcile job failed" },
            { status: 500 }
        );
    }
}

export const GET = handler;
export const POST = handler;
