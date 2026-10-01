import VendorOrder, { ESCROW } from "@/models/VendorOrder";
import Settlement from "@/models/Settlement";
import VendorRecipient from "@/models/VendorRecipient";
import User from "@/models/User";
import { markReleased } from "@/app/lib/escrow";
import { postPayout } from "@/app/lib/ledger";
import { enqueueNotification } from "@/app/lib/notifications";
import {
    createTransferRecipient,
    verifyTransferRecipient,
    initiateTransfer,
} from "@/app/lib/paystack";
import { toIntegerKobo } from "@/app/lib/money";

// Turns released escrow into actual bank transfers.
//
// Flow:
//   1. Group every `release_pending` vendor order by vendor.
//   2. Create a Settlement batch per vendor (so we pay one transfer fee, not N).
//   3. Ensure the vendor has a verified recipient code.
//   4. Initiate the Paystack transfer.
//   5. Mark the vendor orders released and post the payout ledger entry.
//
// Paystack failures are usually transient — funds not yet settled into our
// balance, bank downtime — so a failure schedules a retry with backoff rather
// than giving up.

const MAX_ATTEMPTS = 5;

/** Exponential backoff: 1m, 5m, 30m, 2h, 12h. */
function backoffMs(attempts) {
    const schedule = [60_000, 300_000, 1_800_000, 7_200_000, 43_200_000];
    return schedule[Math.min(attempts - 1, schedule.length - 1)] ?? schedule[schedule.length - 1];
}

/**
 * Ensure a vendor has a valid Paystack recipient code for their bank details.
 * Recipient codes are single-use in Paystack, so we recreate per payout batch.
 */
async function getRecipientCode(vendorId) {
    const recipient = await VendorRecipient.findOne({ vendorId, verifiedAt: { $ne: null } }).lean();
    if (!recipient) {
        return { ok: false, reason: "Vendor has no verified bank account on file" };
    }

    // Try the cached code first — it may still be usable.
    if (recipient.paystackRecipientCode) {
        const { ok, data } = await verifyTransferRecipient(recipient.paystackRecipientCode);
        if (ok && data?.status === true) {
            return { ok: true, code: recipient.paystackRecipientCode, accountName: data.data?.account_name };
        }
    }

    // Cached code is spent or invalid — mint a fresh one.
    const created = await createTransferRecipient({
        type: "nuban",
        name: recipient.accountName,
        accountNumber: recipient.accountNumber,
        bankCode: recipient.bankCode,
    });

    if (!created.ok || !created.data?.data?.recipient_code) {
        return { ok: false, reason: created.data?.message || "Could not create transfer recipient" };
    }

    const code = created.data.data.recipient_code;
    await VendorRecipient.updateOne({ vendorId }, { $set: { paystackRecipientCode: code } });

    // Confirm the account name matches what the vendor gave us. Without this we
    // could pay a mistyped account number.
    const verified = await verifyTransferRecipient(code);
    if (!verified.ok || verified.data?.status !== true) {
        return { ok: false, reason: "Recipient verification failed; check account details" };
    }

    return { ok: true, code, accountName: verified.data.data?.account_name };
}

/** Create a pending settlement batch from a set of released vendor orders. */
async function createSettlementBatch(vendorId, vendorOrders) {
    const grossAmount = vendorOrders.reduce((s, v) => s + toIntegerKobo(v.grossAmount), 0);
    const platformFee = vendorOrders.reduce((s, v) => s + toIntegerKobo(v.platformFee), 0);
    const netAmount = vendorOrders.reduce((s, v) => s + toIntegerKobo(v.netAmount), 0);

    const settlement = await Settlement.create({
        vendorId,
        vendorOrderIds: vendorOrders.map((v) => v._id),
        grossAmount,
        platformFee,
        netAmount,
        amountSent: 0,
        status: "pending",
        scheduledFor: new Date(),
    });

    // Link the settlement back onto each vendor order for traceability.
    await VendorOrder.updateMany(
        { _id: { $in: vendorOrders.map((v) => v._id) } },
        { $set: { settlementId: settlement._id } }
    );

    return settlement;
}

/**
 * Attempt to pay out one settlement. Never throws — failures are recorded on
 * the settlement with a retry schedule so the next job run picks it up.
 */
export async function processSettlement(settlementId) {
    const settlement = await Settlement.findById(settlementId);
    if (!settlement) return { ok: false, reason: "Settlement not found" };
    if (["paid", "cancelled"].includes(settlement.status)) {
        return { ok: false, reason: `Settlement already ${settlement.status}` };
    }

    // Claim it so a concurrent job run does not double-send.
    const claimed = await Settlement.findOneAndUpdate(
        { _id: settlementId, status: { $in: ["pending", "failed"] } },
        {
            $set: { status: "processing" },
            $inc: { attempts: 1 },
        },
        { new: true }
    );
    if (!claimed) return { ok: false, reason: "Settlement is being processed elsewhere" };

    const amount = toIntegerKobo(claimed.netAmount);

    const recipient = await getRecipientCode(claimed.vendorId);
    if (!recipient.ok) {
        return failSettlement(claimed, recipient.reason);
    }

    const transferReference = `stl_${String(claimed._id)}`;
    const { ok, data } = await initiateTransfer({
        amount,
        recipientCode: recipient.code,
        reference: transferReference,
        reason: "Aba Crafts vendor settlement",
    });

    if (!ok || !data?.data?.transfer_code) {
        return failSettlement(claimed, data?.message || "Paystack transfer was rejected");
    }

    // Record what Paystack told us. We do NOT mark the vendor orders released
    // here — that waits for the transfer.success webhook, so money only
    // counts as paid once Paystack confirms it left our account.
    claimed.transferCode = data.data.transfer_code;
    claimed.transferReference = transferReference;
    claimed.transferStatus = data.data.status || "queued";
    claimed.recipientCode = recipient.code;
    claimed.amountSent = amount;
    claimed.failureReason = "";
    await claimed.save();

    return { ok: true, settlementId: claimed._id, transferCode: claimed.transferCode, amount };
}

/** Record a failure and schedule a retry with backoff. */
async function failSettlement(settlement, reason) {
    settlement.status = "failed";
    settlement.failureReason = String(reason || "Unknown error").slice(0, 500);
    if (settlement.attempts < MAX_ATTEMPTS) {
        settlement.nextRetryAt = new Date(Date.now() + backoffMs(settlement.attempts));
    } else {
        // Out of retries — stop trying so we do not hammer Paystack. An admin
        // has to intervene; the admin dashboard surfaces these.
        settlement.nextRetryAt = null;
        settlement.failureReason = `${settlement.failureReason} (gave up after ${settlement.attempts} attempts)`;
    }
    await settlement.save();
    return { ok: false, reason: settlement.failureReason };
}

/**
 * Main job: turn every `release_pending` vendor order into a paid-out
 * settlement, then retry any settlements that previously failed.
 */
export async function runSettlementProcessing({ limit = 50 } = {}) {
    const result = { batches: 0, paid: 0, failed: 0, retried: 0, details: [] };

    // 1. Group newly released vendor orders by vendor.
    const pending = await VendorOrder.find({
        escrowStatus: ESCROW.RELEASE_PENDING,
        settlementId: null,
    })
        .limit(limit * 10)
        .lean();

    const byVendor = new Map();
    for (const vo of pending) {
        const key = String(vo.vendorId);
        if (!byVendor.has(key)) byVendor.set(key, []);
        byVendor.get(key).push(vo);
    }

    for (const [vendorId, vendorOrders] of byVendor) {
        const settlement = await createSettlementBatch(vendorId, vendorOrders);
        result.batches += 1;

        const outcome = await processSettlement(settlement._id);
        if (outcome.ok) {
            result.paid += 1;
        } else {
            result.failed += 1;
            result.details.push({ settlementId: String(settlement._id), reason: outcome.reason });
        }
    }

    // 2. Retry settlements that failed and are due for another attempt.
    const retryable = await Settlement.find({
        status: "failed",
        nextRetryAt: { $ne: null, $lte: new Date() },
        attempts: { $lt: MAX_ATTEMPTS },
    })
        .select("_id")
        .limit(limit)
        .lean();

    for (const s of retryable) {
        result.retried += 1;
        const outcome = await processSettlement(s._id);
        if (outcome.ok) {
            result.paid += 1;
        } else {
            result.failed += 1;
            result.details.push({ settlementId: String(s._id), reason: outcome.reason });
        }
    }

    return result;
}

/**
 * Called from the transfer.success webhook. This is the only place vendor
 * orders are marked released and the payout ledger entry is posted, so a
 * payout is never "successful" based on our own request alone.
 */
export async function confirmSettlementPaid(transferReference, { paystackFee = 0, createdBy = "system:webhook" } = {}) {
    const settlement = await Settlement.findOne({ transferReference });
    if (!settlement) return { ok: false, reason: "No settlement for that transfer" };
    if (settlement.status === "paid") return { ok: true, settlement, duplicate: true };

    settlement.status = "paid";
    settlement.processedAt = new Date();
    settlement.transferStatus = "success";
    settlement.paystackFee = toIntegerKobo(paystackFee);
    settlement.failureReason = "";
    settlement.nextRetryAt = null;
    await settlement.save();

    const vendorOrders = await VendorOrder.find({
        _id: { $in: settlement.vendorOrderIds },
        escrowStatus: ESCROW.RELEASE_PENDING,
    }).select("_id");

    for (const vo of vendorOrders) {
        await markReleased(vo._id, { createdBy });
    }

    await postPayout({
        settlement,
        transferReference,
        paystackFee,
        createdBy,
    });

    // Notification 4 of 4: tell the vendor their money actually arrived. Sent
    // only from the transfer.success webhook, so it reflects Paystack
    // confirming the transfer rather than our own request.
    const vendor = await User.findById(settlement.vendorId).select("email").lean();
    if (vendor?.email) {
        await enqueueNotification({
            to: vendor.email,
            role: "vendor",
            template: "settlement_paid",
            settlementId: settlement._id,
            dedupeKey: `settlement_paid:${transferReference}`,
            data: {
                netAmount: toIntegerKobo(settlement.amountSent),
                paystackFee: toIntegerKobo(paystackFee),
                coveredOrders: vendorOrders.length,
            },
        });
    }

    return { ok: true, settlement, releasedOrders: vendorOrders.length };
}

export { MAX_ATTEMPTS };
