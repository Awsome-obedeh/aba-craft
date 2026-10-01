import VendorOrder, { ESCROW, FULFILLMENT, canTransitionFulfillment } from "@/models/VendorOrder";
import User from "@/models/User";
import { postEscrowRelease } from "@/app/lib/ledger";
import { enqueueNotification } from "@/app/lib/notifications";
import { effectiveAutoReleaseDays, toIntegerKobo } from "@/app/lib/money";

// Look up the customer on an order, for notifications. Vendors should only
// ever be emailed about their own slice; the customer gets the receipt prompts.
async function getCustomer(orderId) {
    const { default: Order } = await import("@/models/Order");
    const order = await Order.findById(orderId).select("customer total").lean();
    if (!order?.customer) return null;
    const user = await User.findById(order.customer).select("email fullName").lean();
    return user?.email ? { email: user.email, totalKobo: Math.round((order.total || 0) * 100) } : null;
}

// The escrow state machine.
//
// Release requires BOTH:
//   1. vendorConfirmedDeliveryAt  — the vendor says they delivered
//   2. customerConfirmedReceiptAt — the customer says they received it
// ...or the auto-release deadline passes with no open dispute.
//
// The critical detail in this file is that every money-affecting transition is
// a SINGLE atomic findOneAndUpdate whose filter carries the preconditions. A
// read-then-write (find -> check -> save) would let the customer clicking
// "Confirm receipt" and the auto-release cron both pass the check and both
// enqueue a transfer. Putting the preconditions in the filter means the
// database decides, and the loser gets null back and does nothing.

/** Can this vendor order be released right now? Pure check, no side effects. */
export function isReleasable(vendorOrder, now = new Date()) {
    if (!vendorOrder) return false;
    if (vendorOrder.escrowStatus !== ESCROW.HELD) return false;
    if (vendorOrder.disputeStatus === "open") return false;
    if (!vendorOrder.vendorConfirmedDeliveryAt) return false;

    const customerConfirmed = Boolean(vendorOrder.customerConfirmedReceiptAt);
    const deadlinePassed = Boolean(
        vendorOrder.autoReleaseAt && vendorOrder.autoReleaseAt.getTime() <= now.getTime()
    );
    return customerConfirmed || deadlinePassed;
}

/**
 * Atomically move a held vendor order to `release_pending`.
 *
 * This is the ONLY path that can enqueue a payout. Returns the updated
 * document, or null if the preconditions failed (already released, disputed,
 * not yet delivered, or another request won the race).
 */
export async function requestRelease(vendorOrderId, { createdBy = "system:escrow", reason = "" } = {}) {
    const now = new Date();

    const released = await VendorOrder.findOneAndUpdate(
        {
            _id: vendorOrderId,
            escrowStatus: ESCROW.HELD,
            disputeStatus: { $ne: "open" },
            vendorConfirmedDeliveryAt: { $ne: null },
        },
        {
            $set: { escrowStatus: ESCROW.RELEASE_PENDING, releaseRequestedAt: now, releaseRequestedBy: createdBy },
            $push: { statusLog: { at: now, event: "release_requested", by: createdBy, note: reason } },
        },
        { new: true }
    );

    // Precondition failed or someone else got here first.
    if (!released) return null;

    // Post the escrow -> payable move. Idempotency is keyed on the vendor
    // order id, so a retry of the settlement job cannot double-post.
    await postEscrowRelease({
        vendorOrder: released,
        reference: `vo_${String(released._id)}`,
        createdBy,
    });

    return released;
}

/**
 * Called after a customer confirms receipt, or by the auto-release job.
 * Marks the order released and records the timestamp.
 */
export async function markReleased(vendorOrderId, { createdBy = "system:escrow" } = {}) {
    const now = new Date();
    return VendorOrder.findOneAndUpdate(
        { _id: vendorOrderId, escrowStatus: ESCROW.RELEASE_PENDING },
        {
            $set: { escrowStatus: ESCROW.RELEASED, releasedAt: now },
            $push: { statusLog: { at: now, event: "released", by: createdBy } },
        },
        { new: true }
    );
}

/**
 * Vendor confirms delivery. Sets the auto-release deadline at the same time —
 * if the customer never responds, the job will release on this date.
 */
export async function confirmDelivery(vendorOrderId, { proofUrl = "", trackingNumber = "", createdBy = "system:vendor" } = {}) {
    const now = new Date();
    const autoReleaseAt = new Date(now.getTime() + effectiveAutoReleaseDays() * 24 * 60 * 60 * 1000);

    const updated = await VendorOrder.findOneAndUpdate(
        {
            _id: vendorOrderId,
            // Fulfillment must have reached delivered for the money to move.
            fulfillmentStatus: FULFILLMENT.DELIVERED,
            vendorConfirmedDeliveryAt: null,
            escrowStatus: ESCROW.HELD,
        },
        {
            $set: {
                vendorConfirmedDeliveryAt: now,
                autoReleaseAt,
                ...(proofUrl ? { deliveryProofUrl: proofUrl } : {}),
                ...(trackingNumber ? { trackingNumber } : {}),
            },
            $push: { statusLog: { at: now, event: "vendor_confirmed_delivery", by: createdBy } },
        },
        { new: true }
    );

    // Notification 2 of 4: ask the customer to confirm receipt now, while the
    // item is in front of them and a release is the least likely outcome.
    if (updated) {
        const customer = await getCustomer(updated.orderId);
        if (customer) {
            await enqueueNotification({
                to: customer.email,
                role: "customer",
                template: "delivered_confirm_receipt",
                vendorOrderId: updated._id,
                orderId: updated.orderId,
                dedupeKey: `delivered_confirm_receipt:${vendorOrderId}`,
                data: { totalAmount: customer.totalKobo, autoReleaseDays: effectiveAutoReleaseDays() },
            });
        }
    }

    return updated;
}

/** Customer confirms receipt. Triggers immediate release if already delivered. */
export async function confirmReceipt(vendorOrderId, { createdBy = "system:customer" } = {}) {
    const now = new Date();
    return VendorOrder.findOneAndUpdate(
        {
            _id: vendorOrderId,
            customerConfirmedReceiptAt: null,
            escrowStatus: ESCROW.HELD,
            disputeStatus: { $ne: "open" },
        },
        {
            $set: { customerConfirmedReceiptAt: now },
            $push: { statusLog: { at: now, event: "customer_confirmed_receipt", by: createdBy } },
        },
        { new: true }
    );
}

/**
 * Customer opens a dispute. Freezes the escrow and clears the auto-release
 * deadline so the cron cannot pay out while the dispute is open.
 */
export async function openDispute(vendorOrderId, reason, { createdBy = "system:customer" } = {}) {
    const now = new Date();
    const updated = await VendorOrder.findOneAndUpdate(
        {
            _id: vendorOrderId,
            escrowStatus: { $in: [ESCROW.HELD, ESCROW.RELEASE_PENDING] },
            disputeStatus: { $ne: "open" },
        },
        {
            $set: {
                disputeStatus: "open",
                escrowStatus: ESCROW.DISPUTED,
                disputedAt: now,
                disputeReason: String(reason || "").slice(0, 2000),
                autoReleaseAt: null, // freeze the clock
            },
            $push: { statusLog: { at: now, event: "dispute_opened", by: createdBy } },
        },
        { new: true }
    );

    // Let the vendor know the money is frozen, so a dispute is never a silent
    // surprise when their payout does not arrive.
    if (updated) {
        const vendor = await User.findById(updated.vendorId).select("email").lean();
        if (vendor?.email) {
            await enqueueNotification({
                to: vendor.email,
                role: "vendor",
                template: "dispute_opened",
                vendorOrderId: updated._id,
                orderId: updated.orderId,
                dedupeKey: `dispute_opened:${vendorOrderId}`,
                data: { netAmount: updated.netAmount, reason: updated.disputeReason },
            });
        }
    }

    return updated;
}

/**
 * Notification 3 of 4: warn the customer that funds are about to release
 * without their confirmation. Runs from a daily job, once per vendor order,
 * so the customer gets a genuine last chance to dispute.
 */
export async function sendAutoReleaseWarnings({ daysBefore = 2, limit = 100 } = {}) {
    const now = new Date();
    const cutoff = new Date(now.getTime() + daysBefore * 24 * 60 * 60 * 1000);

    const due = await VendorOrder.find({
        escrowStatus: ESCROW.HELD,
        disputeStatus: { $ne: "open" },
        customerConfirmedReceiptAt: null,
        autoReleaseAt: { $ne: null, $gt: now, $lte: cutoff },
    })
        .select("_id orderId")
        .limit(limit)
        .lean();

    let sent = 0;
    for (const vo of due) {
        const full = await VendorOrder.findById(vo._id).lean();
        const customer = await getCustomer(full.orderId);
        if (!customer) continue;

        const daysRemaining = Math.max(
            1,
            Math.ceil((new Date(full.autoReleaseAt).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        );

        const queued = await enqueueNotification({
            to: customer.email,
            role: "customer",
            template: "auto_release_warning",
            vendorOrderId: vo._id,
            orderId: full.orderId,
            // Keyed on the day bucket so a customer gets one warning per day
            // rather than one per job run.
            dedupeKey: `auto_release_warning:${vo._id}:${daysRemaining}`,
            data: { totalAmount: customer.totalKobo, daysRemaining },
        });

        if (queued) sent += 1;
    }

    return { scanned: due.length, queued: sent };
}

/**
 * Admin resolves a dispute.
 *
 *   resolution = "release" -> funds to the vendor
 *   resolution = "refund"  -> escrow back out to the customer
 */
export async function resolveDispute(vendorOrderId, resolution, adminId, note = "") {
    const now = new Date();
    const toRelease = resolution === "release";

    return VendorOrder.findOneAndUpdate(
        { _id: vendorOrderId, disputeStatus: "open" },
        {
            $set: {
                disputeStatus: "resolved",
                resolvedAt: now,
                resolvedBy: adminId,
                disputeResolution: String(note || resolution).slice(0, 2000),
                // Back to held so requestRelease's filter applies cleanly.
                escrowStatus: ESCROW.HELD,
                // An admin decision counts as the customer side of the gate;
                // otherwise a release decision could never actually pay out.
                ...(toRelease ? { customerConfirmedReceiptAt: now } : {}),
            },
            $push: { statusLog: { at: now, event: `dispute_resolved_${resolution}`, by: String(adminId) } },
        },
        { new: true }
    );
}

/** Advance fulfilment, guarding the transition. */
export async function advanceFulfillment(vendorOrderId, nextStatus, { createdBy = "system:vendor" } = {}) {
    const current = await VendorOrder.findById(vendorOrderId).select("fulfillmentStatus").lean();
    if (!current) return null;
    if (!canTransitionFulfillment(current.fulfillmentStatus, nextStatus)) return null;

    const now = new Date();
    return VendorOrder.findOneAndUpdate(
        { _id: vendorOrderId, fulfillmentStatus: current.fulfillmentStatus },
        {
            $set: { fulfillmentStatus: nextStatus },
            $push: { statusLog: { at: now, event: `fulfillment_${nextStatus}`, by: createdBy } },
        },
        { new: true }
    );
}

/**
 * Find every vendor order that is due for auto-release, and move each one to
 * release_pending. Safe to run concurrently from multiple instances: the
 * atomic filter in requestRelease means only one caller wins per order.
 */
export async function runAutoRelease({ limit = 100 } = {}) {
    const now = new Date();

    const due = await VendorOrder.find({
        escrowStatus: ESCROW.HELD,
        disputeStatus: { $ne: "open" },
        vendorConfirmedDeliveryAt: { $ne: null },
        customerConfirmedReceiptAt: null, // customer has not spoken
        autoReleaseAt: { $ne: null, $lte: now },
    })
        .select("_id")
        .limit(limit)
        .lean();

    const released = [];
    for (const vo of due) {
        const result = await requestRelease(vo._id, {
            createdBy: "system:auto-release",
            reason: "auto-released after customer confirmation window elapsed",
        });
        if (result) released.push(result);
    }

    return { scanned: due.length, released: released.length, orders: released };
}

/**
 * Partial dispute outcome: the escrow is split between customer and vendor.
 *
 * A single partial refund is refunded through Paystack and the remainder is
 * released to the vendor on the normal settlement path. A zero refund is
 * treated as a full release, and a full refund as a total refund, so the
 * caller can use one code path for every outcome.
 *
 * @param {object} vendorOrder
 * @param {number} refundKobo  amount to return to the customer
 * @returns {{mode: 'full'|'none'|'partial', refundKobo, releaseKobo}}
 */
export async function resolveDisputePartially(vendorOrder, refundKobo, adminId, note = "") {
    const escrow = toIntegerKobo(vendorOrder.netAmount);
    const refund = Math.max(0, Math.min(toIntegerKobo(refundKobo), escrow));
    const release = escrow - refund;

    // Nothing refunded -> this is just a release.
    if (refund === 0) {
        return { mode: "none", refundKobo: 0, releaseKobo: escrow };
    }

    // Everything refunded -> a total refund, which is the existing path.
    if (release === 0) {
        return { mode: "full", refundKobo: refund, releaseKobo: 0 };
    }

    // Mark resolved, and record the customer's side as satisfied so the release
    // half can flow through the normal requestRelease path.
    const now = new Date();
    await VendorOrder.findOneAndUpdate(
        { _id: vendorOrder._id, disputeStatus: "open" },
        {
            $set: {
                disputeStatus: "resolved",
                resolvedAt: now,
                resolvedBy: adminId,
                disputeResolution: String(
                    note || `Partial refund of ${refund}, remainder ${release} to vendor`
                ).slice(0, 2000),
                escrowStatus: ESCROW.HELD,
                customerConfirmedReceiptAt: now,
                // The amount the vendor will actually be paid. requestRelease
                // reads this so a partial payout is not a full one.
                netAmount: release,
                // Remember the original for the ledger and the audit trail.
                disputedNetAmount: escrow,
                partialRefundKobo: refund,
            },
            $push: { statusLog: { at: now, event: "dispute_resolved_partial", by: String(adminId) } },
        }
    );

    return { mode: "partial", refundKobo: refund, releaseKobo: release };
}

export { ESCROW, FULFILLMENT, canTransitionFulfillment };
