// GET /api/vendor/orders
//
// The vendor's own slice of every order containing their products, with escrow
// and fulfilment state attached.
//
// This exists instead of reading the shared Order status, because an order can
// involve several vendors: one vendor marking their item shipped must not move
// the other vendors' items. Each vendor advances and confirms their own
// VendorOrder, and the parent's status is only a display convenience.

import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import VendorOrder from "@/models/VendorOrder";
import Order from "@/models/Order";
import { NextResponse } from "next/server";

export async function GET(req) {
    const auth = await verifyAuth(req, ["vendor"]);
    if (!auth.isValid) {
        return NextResponse.json(
            { success: false, message: auth.message },
            { status: auth.status }
        );
    }

    try {
        await connectDB();
        const vendorId = auth.user.id;

        const vendorOrders = await VendorOrder.find({ vendorId })
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();

        const orderIds = [...new Set(vendorOrders.map((v) => String(v.orderId)))];

        // Shipping details live on the parent order. Fetch once rather than
        // per row, and only the fields the vendor actually needs.
        const orders = await Order.find({ _id: { $in: orderIds } })
            .select("orderNo shippingAddress paymentStatus createdAt")
            .lean();
        const orderById = new Map(orders.map((o) => [String(o._id), o]));

        const now = Date.now();
        const data = vendorOrders.map((vo) => {
            const order = orderById.get(String(vo.orderId));

            // The countdown is only meaningful once delivery is confirmed and
            // the customer has not yet confirmed receipt.
            const deadline =
                vo.escrowStatus === "held" &&
                vo.vendorConfirmedDeliveryAt &&
                !vo.customerConfirmedReceiptAt &&
                vo.disputeStatus !== "open" &&
                vo.autoReleaseAt
                    ? new Date(vo.autoReleaseAt).getTime()
                    : null;

            return {
                vendorOrderId: String(vo._id),
                orderId: String(vo.orderId),
                orderNo: order?.orderNo || "",
                placedAt: vo.createdAt,
                paymentStatus: order?.paymentStatus || "unknown",

                items: vo.items || [],
                grossAmount: vo.grossAmount,
                platformFee: vo.platformFee,
                netAmount: vo.netAmount,

                fulfillmentStatus: vo.fulfillmentStatus,
                escrowStatus: vo.escrowStatus,
                disputeStatus: vo.disputeStatus,
                disputeReason: vo.disputeReason,
                disputeResolution: vo.disputeResolution,

                vendorConfirmedDeliveryAt: vo.vendorConfirmedDeliveryAt,
                customerConfirmedReceiptAt: vo.customerConfirmedReceiptAt,
                autoReleaseAt: vo.autoReleaseAt,
                releasedAt: vo.releasedAt,
                partialRefundKobo: vo.partialRefundKobo,
                deliveryProofUrl: vo.deliveryProofUrl,
                trackingNumber: vo.trackingNumber,
                settlementId: vo.settlementId ? String(vo.settlementId) : null,

                releaseCountdownMs: deadline ? Math.max(0, deadline - now) : null,

                // The two actions a vendor can take, precomputed so the UI
                // does not have to re-derive the state machine.
                canConfirmDelivery:
                    vo.fulfillmentStatus === "delivered" &&
                    vo.escrowStatus === "held" &&
                    !vo.vendorConfirmedDeliveryAt,
                canAdvance:
                    vo.fulfillmentStatus !== "delivered" &&
                    vo.fulfillmentStatus !== "cancelled" &&
                    vo.escrowStatus !== "refunded",

                shippingAddress: order?.shippingAddress || null,
                statusLog: vo.statusLog || [],
            };
        });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("VENDOR ORDERS ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Server error loading vendor orders" },
            { status: 500 }
        );
    }
}
