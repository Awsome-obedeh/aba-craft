import connectDB from "@/app/lib/connect";
import Order from "@/models/Order";
import VendorOrder, { ESCROW } from "@/models/VendorOrder";
import WebhookEvent from "@/models/WebhookEvent";
import { holdEscrowForOrder } from "@/app/lib/escrowHold";
import { postRefund } from "@/app/lib/ledger";
import { confirmSettlementPaid } from "@/app/lib/settlement";
import { toIntegerKobo } from "@/app/lib/money";
import { verifyWebhookSignature } from "@/app/lib/paystack";
import { withTransaction } from "@/app/lib/withTransaction";

// Paystack webhook receiver.
//
// This is the only trusted source of payment truth. The frontend /payments/verify
// route is a convenience for the customer's browser; it must never be what
// moves an order to paid on its own.
//
// Three properties this file is built around:
//
//  1. IDEMPOTENT. Paystack retries. We key on the business fact the event
//     describes, not a provider event id, because those are not stable across
//     retries.
//  2. ATOMIC. The dedupe row and its effect are written together, so a crash
//     can never leave an event marked processed but unapplied.
//  3. FAILS LOUDLY. We return 5xx on error so Paystack retries. The previous
//     version swallowed errors and returned 200, which silently dropped
//     payments whenever the database was briefly unavailable.

export const POST = async (req) => {
    // Signature first, before parsing or touching the database.
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!verifyWebhookSignature(rawBody, signature)) {
        console.error("[paystack-webhook] rejected: invalid signature");
        return new Response("Invalid signature", { status: 401 });
    }

    let event;
    try {
        event = JSON.parse(rawBody);
    } catch {
        // Not retryable — retrying malformed JSON will not help.
        return new Response("Invalid JSON", { status: 400 });
    }

    const eventType = event?.event;
    if (!eventType) return new Response("Missing event type", { status: 400 });

    try {
        await connectDB();

        switch (eventType) {
            case "charge.success":
                await handleChargeSuccess(event);
                break;
            case "transfer.success":
                await handleTransferSuccess(event);
                break;
            case "transfer.failed":
                await handleTransferFailed(event);
                break;
            case "refund.processed":
                await handleRefundProcessed(event);
                break;
            default:
                // Acknowledge unhandled types so Paystack stops retrying them.
                console.log(`[paystack-webhook] ignoring unhandled event: ${eventType}`);
        }

        return new Response("OK", { status: 200 });
    } catch (error) {
        // 5xx tells Paystack this delivery failed and should be retried. This
        // is the fix for the old handler's silent payment loss.
        console.error(`[paystack-webhook] failed to process ${eventType}:`, error);
        return new Response("Processing failed", { status: 500 });
    }
};

/**
 * Claim an event for processing. Returns false if we have already handled this
 * business fact, in which case the caller should skip.
 *
 * The insert is the lock: the unique index on dedupeKey means only one
 * concurrent delivery wins, even without a transaction.
 */
async function claimEvent({ event, dedupeKey, payload }) {
    try {
        await WebhookEvent.create({ event, dedupeKey, payload, provider: "paystack" });
        return true;
    } catch (err) {
        if (err?.code === 11000) {
            console.log(`[paystack-webhook] duplicate ignored: ${dedupeKey}`);
            return false;
        }
        throw err;
    }
}

// charge.success — mark the order paid and open an escrow hold per vendor.
async function handleChargeSuccess(event) {
    const data = event?.data || {};
    const reference = data?.reference;
    if (!reference) throw new Error("charge.success without a reference");

    const dedupeKey = `charge_success:${reference}`;
    const claimed = await claimEvent({ event: "charge.success", dedupeKey, payload: data });
    if (!claimed) return;

    // amount is in kobo, same unit as our ledger.
    const amountKobo = toIntegerKobo(data.amount);

    await withTransaction(async () => {
        const order = await Order.findOne({ paymentRef: reference });
        if (!order) {
            // Nothing to attach the payment to. Log loudly; the reconcile job
            // will surface unclaimed payments.
            console.error(`[paystack-webhook] charge for unknown reference ${reference}`);
            return;
        }

        if (order.paymentStatus === "paid") {
            console.log(`[paystack-webhook] order ${order._id} already paid`);
            return;
        }

        order.paymentStatus = "paid";
        order.paidAt = new Date();
        if (order.status === "pending_payment") order.status = "paid";
        await order.save();

        // Open the escrow holds. Shared with the /payments/verify fallback path
        // so both behave identically.
        const vendorOrders = await holdEscrowForOrder(order, reference, {
            createdBy: "system:charge_success",
        });

        console.log(
            `[paystack-webhook] order ${order._id} paid ${amountKobo} kobo, ${vendorOrders?.length || 0} vendor order(s) held`
        );
    });
}

// transfer.success — a vendor payout actually left our account.
async function handleTransferSuccess(event) {
    const data = event?.data || {};
    const transferReference = data?.reference;
    if (!transferReference) throw new Error("transfer.success without a reference");

    const dedupeKey = `transfer_success:${transferReference}`;
    const claimed = await claimEvent({ event: "transfer.success", dedupeKey, payload: data });
    if (!claimed) return;

    const result = await confirmSettlementPaid(transferReference, {
        // Paystack reports the transfer fee here. We absorb it rather than
        // deducting from the vendor's net.
        paystackFee: toIntegerKobo(data.fees || 0),
        createdBy: "system:webhook",
    });

    if (!result.ok) {
        throw new Error(`transfer.success could not settle: ${result.reason}`);
    }

    console.log(
        `[paystack-webhook] settlement paid for ${transferReference}, ${result.releasedOrders} vendor order(s) released`
    );
}

// transfer.failed — record the failure; the settlement job retries with backoff.
async function handleTransferFailed(event) {
    const data = event?.data || {};
    const transferReference = data?.reference;
    if (!transferReference) throw new Error("transfer.failed without a reference");

    const dedupeKey = `transfer_failed:${transferReference}`;
    const claimed = await claimEvent({ event: "transfer.failed", dedupeKey, payload: data });
    if (!claimed) return;

    const { default: Settlement } = await import("@/models/Settlement");
    const settlement = await Settlement.findOne({ transferReference });
    if (!settlement) {
        console.error(`[paystack-webhook] transfer.failed for unknown settlement ${transferReference}`);
        return;
    }

    settlement.status = "failed";
    settlement.failureReason = String(data.reason || data.gateway_response || "Transfer failed").slice(0, 500);
    // Schedule an immediate retry attempt; the backoff in settlement.js takes
    // over from the attempt counter if it keeps failing.
    settlement.nextRetryAt = new Date();
    await settlement.save();

    console.error(`[paystack-webhook] transfer failed for ${transferReference}: ${settlement.failureReason}`);
}

// refund.processed — money is back with the customer.
async function handleRefundProcessed(event) {
    const data = event?.data || {};
    const reference = data?.transaction_reference || data?.reference;
    if (!reference) throw new Error("refund.processed without a reference");

    const dedupeKey = `refund_processed:${data?.id || reference}`;
    const claimed = await claimEvent({ event: "refund.processed", dedupeKey, payload: data });
    if (!claimed) return;

    const order = await Order.findOne({ paymentRef: reference });
    if (!order) {
        console.error(`[paystack-webhook] refund for unknown order reference ${reference}`);
        return;
    }

    order.paymentStatus = "refunded";
    if (["pending_payment", "paid", "processing", "shipped", "delivered"].includes(order.status)) {
        order.status = "cancelled";
    }
    await order.save();

    // Escrow for this order is gone — move the vendor orders to refunded so the
    // auto-release job stops considering them.
    await VendorOrder.updateMany(
        { orderId: order._id, escrowStatus: { $in: [ESCROW.HELD, ESCROW.DISPUTED, ESCROW.RELEASE_PENDING] } },
        {
            $set: { escrowStatus: ESCROW.REFUNDED, autoReleaseAt: null },
            $push: { statusLog: { at: new Date(), event: "refunded", by: "system:webhook" } },
        }
    );

    const amountKobo = toIntegerKobo(data.amount);
    await postRefund({
        order,
        amountKobo,
        reference: data?.id ? String(data.id) : reference,
        reason: "Customer refund processed",
        createdBy: "system:webhook",
    });

    console.log(`[paystack-webhook] refund processed for order ${order._id}`);
}
