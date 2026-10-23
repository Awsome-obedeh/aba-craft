// POST /api/orders/[id]/escrow
//
// The confirmations that gate a payout, plus disputes. Everything here acts on
// the parent Order id; the underlying work happens per VendorOrder, because a
// single order can involve several vendors and each has its own escrow.
//
//   action = "confirm-delivery"  vendor  — "I delivered it" (sets auto-release)
//   action = "confirm-receipt"   customer — "I received it" (may release now)
//   action = "dispute"           customer — "something is wrong" (freezes funds)
//
// A customer confirming receipt only releases a vendor order whose vendor has
// already confirmed delivery. If the vendor has not, we record the receipt and
// release happens as soon as their side lands.

import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Order from "@/models/Order";
import VendorOrder, { ESCROW, FULFILLMENT } from "@/models/VendorOrder";
import { NextResponse } from "next/server";
import {
    confirmDelivery,
    confirmReceipt,
    openDispute,
    advanceFulfillment,
    requestRelease,
    isReleasable,
} from "@/app/lib/escrow";

const ACTIONS = ["confirm-delivery", "confirm-receipt", "dispute", "advance-fulfillment"];

// GET /api/orders/[id]/escrow
//
// The read model the customer and vendor UIs render: one entry per vendor
// slice, each with its own fulfilment state, escrow state and release deadline.
// A single order can hold several of these, which is why the UI must be
// per-slice rather than per-order.
export async function GET(req, { params }) {
    const auth = await verifyAuth(req, ["customer", "vendor", "admin"]);
    if (!auth.isValid) {
        return NextResponse.json(
            { success: false, message: auth.message },
            { status: auth.status }
        );
    }

    const { id } = await params;

    try {
        await connectDB();

        const order = await Order.findById(id);
        if (!order) {
            return NextResponse.json(
                { success: false, message: "Order not found" },
                { status: 404 }
            );
        }

        const userId = String(auth.user.id);
        const isAdmin = auth.user.role === "admin";
        const isCustomer = order.customer && String(order.customer) === userId;
        const isVendor = order.items.some((i) => String(i.vendor) === userId);

        if (!isCustomer && !isVendor && !isAdmin) {
            return NextResponse.json(
                { success: false, message: "Forbidden" },
                { status: 403 }
            );
        }

        let query = { orderId: order._id };
        // A vendor only ever sees their own slice.
        if (isVendor && !isAdmin) query.vendorId = userId;

        const vendorOrders = await VendorOrder.find(query)
            .populate("vendorId", "fullName email businessName")
            .lean();

        const now = Date.now();
        const items = vendorOrders.map((vo) => {
            // Only a slice that is actually held and delivered is at risk of
            // releasing, so the countdown is only surfaced there.
            const deadline =
                vo.escrowStatus === ESCROW.HELD &&
                vo.vendorConfirmedDeliveryAt &&
                !vo.customerConfirmedReceiptAt &&
                vo.disputeStatus !== "open" &&
                vo.autoReleaseAt
                    ? new Date(vo.autoReleaseAt).getTime()
                    : null;

            return {
                vendorOrderId: String(vo._id),
                // A slice can cover several products from the same vendor, so
                // summarise the line rather than pretending there is one item.
                itemName: (vo.items || [])
                    .map((i) => `${i.productName} x${i.quantity}`)
                    .join(", "),
                itemImage: vo.items?.[0]?.productImage || "",
                items: vo.items || [],
                grossAmount: vo.grossAmount,
                platformFee: vo.platformFee,
                netAmount: vo.netAmount,
                fulfillmentStatus: vo.fulfillmentStatus,
                escrowStatus: vo.escrowStatus,
                disputeStatus: vo.disputeStatus,
                vendorConfirmedDeliveryAt: vo.vendorConfirmedDeliveryAt,
                customerConfirmedReceiptAt: vo.customerConfirmedReceiptAt,
                autoReleaseAt: vo.autoReleaseAt,
                releasedAt: vo.releasedAt,
                partialRefundKobo: vo.partialRefundKobo,
                // Consumer-friendly, pre-computed on the server so every
                // client renders the same countdown.
                releaseCountdownMs: deadline ? Math.max(0, deadline - now) : null,
                canConfirmReceipt:
                    vo.escrowStatus === ESCROW.HELD &&
                    Boolean(vo.vendorConfirmedDeliveryAt) &&
                    !vo.customerConfirmedReceiptAt &&
                    vo.disputeStatus !== "open",
                canDispute:
                    [ESCROW.HELD, ESCROW.RELEASE_PENDING].includes(vo.escrowStatus) &&
                    vo.disputeStatus !== "open",
                vendor: vo.vendorId
                    ? {
                          name: vo.vendorId.fullName,
                          businessName: vo.vendorId.businessName,
                      }
                    : null,
            };
        });

        return NextResponse.json({
            success: true,
            order: {
                _id: String(order._id),
                orderNo: order.orderNo,
                paymentStatus: order.paymentStatus,
                total: order.total,
            },
            items,
        });
    } catch (error) {
        console.error("ESCROW READ ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Server error loading escrow" },
            { status: 500 }
        );
    }
}

export async function POST(req, { params }) {
    const auth = await verifyAuth(req, ["customer", "vendor", "admin"]);
    if (!auth.isValid) {
        return NextResponse.json(
            { success: false, message: auth.message },
            { status: auth.status }
        );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const {
        action,
        note = "",
        proofUrl = "",
        trackingNumber = "",
        nextStatus = "",
        // Optional. A single order can hold several vendors' escrows, and a
        // customer often wants to dispute one item without freezing the whole
        // order. Omitting it applies the action to every slice the actor owns.
        vendorOrderId = "",
    } = body || {};

    if (!ACTIONS.includes(action)) {
        return NextResponse.json(
            { success: false, message: "Invalid action" },
            { status: 400 }
        );
    }

    try {
        await connectDB();

        const order = await Order.findById(id);
        if (!order) {
            return NextResponse.json(
                { success: false, message: "Order not found" },
                { status: 404 }
            );
        }

        const userId = String(auth.user.id);
        const isCustomer = order.customer && String(order.customer) === userId;
        const isVendor = order.items.some((i) => String(i.vendor) === userId);
        const isAdmin = auth.user.role === "admin";

        if (!isCustomer && !isVendor && !isAdmin) {
            return NextResponse.json(
                { success: false, message: "Forbidden" },
                { status: 403 }
            );
        }

        // Scope to the vendor orders this actor actually owns, so a vendor
        // acting on a shared cart only moves their own slice.
        let vendorOrders = await VendorOrder.find({ orderId: order._id });
        if (isVendor && !isAdmin) {
            vendorOrders = vendorOrders.filter((v) => String(v.vendorId) === userId);
            if (vendorOrders.length === 0) {
                return NextResponse.json(
                    { success: false, message: "No items in this order belong to you" },
                    { status: 403 }
                );
            }
        }

        // Narrow to one vendor's slice if asked. Applied after ownership
        // filtering, so this cannot be used to reach another vendor's escrow.
        if (vendorOrderId) {
            const target = String(vendorOrderId);
            const owned = vendorOrders.some((v) => String(v._id) === target);
            if (!owned) {
                return NextResponse.json(
                    { success: false, message: "That item is not part of your order" },
                    { status: 403 }
                );
            }
            vendorOrders = vendorOrders.filter((v) => String(v._id) === target);
        }

        // Money is only ever held once payment is captured.
        const needsPaid = ["confirm-delivery", "confirm-receipt", "dispute"];
        if (needsPaid.includes(action) && order.paymentStatus !== "paid") {
            return NextResponse.json(
                { success: false, message: "Order has not been paid yet" },
                { status: 400 }
            );
        }

        const actor = isAdmin ? `admin:${userId}` : `${auth.user.role}:${userId}`;
        const touched = [];

        for (const vo of vendorOrders) {
            // Only a still-held vendor order is actionable. A released or
            // refunded one is history.
            if (vo.escrowStatus !== ESCROW.HELD) {
                continue;
            }

            if (action === "confirm-delivery") {
                if (isCustomer && !isAdmin) {
                    return NextResponse.json(
                        { success: false, message: "Only the vendor can confirm delivery" },
                        { status: 403 }
                    );
                }
                // Fulfilment must reach `delivered` first — the vendor marks it
                // delivered, then confirms the delivery confirmation.
                if (vo.fulfillmentStatus !== FULFILLMENT.DELIVERED) {
                    touched.push({
                        vendorOrderId: String(vo._id),
                        skipped: "Mark the order delivered before confirming delivery",
                    });
                    continue;
                }
                const updated = await confirmDelivery(vo._id, { proofUrl, trackingNumber, createdBy: actor });
                if (updated) touched.push({ vendorOrderId: String(vo._id), vendorConfirmed: true });
                continue;
            }

            if (action === "confirm-receipt") {
                if (isVendor && !isAdmin) {
                    return NextResponse.json(
                        { success: false, message: "Only the customer can confirm receipt" },
                        { status: 403 }
                    );
                }
                const updated = await confirmReceipt(vo._id, { createdBy: actor });
                if (updated) touched.push({ vendorOrderId: String(vo._id), customerConfirmed: true });
                continue;
            }

            if (action === "dispute") {
                if (isVendor && !isAdmin) {
                    return NextResponse.json(
                        { success: false, message: "Only the customer can open a dispute" },
                        { status: 403 }
                    );
                }
                const updated = await openDispute(vo._id, note, { createdBy: actor });
                if (updated) touched.push({ vendorOrderId: String(vo._id), disputed: true });
                continue;
            }

            if (action === "advance-fulfillment") {
                if (isCustomer && !isAdmin) {
                    return NextResponse.json(
                        { success: false, message: "Only the vendor can update fulfilment" },
                        { status: 403 }
                    );
                }
                const updated = await advanceFulfillment(vo._id, nextStatus, { createdBy: actor });
                if (updated) {
                    touched.push({ vendorOrderId: String(vo._id), fulfillmentStatus: updated.fulfillmentStatus });
                } else {
                    touched.push({
                        vendorOrderId: String(vo._id),
                        skipped: `Cannot move from ${vo.fulfillmentStatus} to ${nextStatus}`,
                    });
                }
                continue;
            }
        }

        // A customer confirmation is the trigger for immediate release, but only
        // where BOTH sides are now true. requestRelease's atomic filter is what
        // makes this safe against the auto-release job running concurrently.
        const released = [];
        if (action === "confirm-receipt" || action === "confirm-delivery") {
            for (const t of touched) {
                if (t.skipped) continue;
                const vo = await VendorOrder.findById(t.vendorOrderId);
                if (vo && isReleasable(vo)) {
                    const r = await requestRelease(vo._id, {
                        createdBy: actor,
                        reason: "both confirmations received",
                    });
                    if (r) released.push(String(r._id));
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: summarise(action, touched, released),
            results: touched,
            releaseRequested: released,
        });
    } catch (error) {
        console.error("ESCROW ACTION ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Server error updating escrow" },
            { status: 500 }
        );
    }
}

function summarise(action, touched, released) {
    const done = touched.filter((t) => !t.skipped);
    const skipped = touched.filter((t) => t.skipped);

    if (!done.length) {
        return skipped[0]?.skipped || "Nothing to update";
    }
    let msg = `${action} recorded on ${done.length} vendor order(s)`;
    if (released.length) {
        msg += ` — ${released.length} released for settlement`;
    } else if (action === "confirm-receipt") {
        msg += " — waiting on the vendor to confirm delivery";
    }
    if (skipped.length) msg += ` (${skipped.length} skipped)`;
    return msg;
}
