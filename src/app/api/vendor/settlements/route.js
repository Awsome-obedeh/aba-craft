// GET /api/vendor/settlements
//
// The vendor's money view: what is currently held for them, what is waiting to
// be paid, and what has already gone out. Money is returned in kobo (integer)
// alongside a naira string for display, so the client never has to guess units.

import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import VendorOrder, { ESCROW } from "@/models/VendorOrder";
import Order from "@/models/Order";
import Settlement from "@/models/Settlement";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { koboToNaira } from "@/app/lib/money";

export const dynamic = "force-dynamic";

export async function GET(req) {
    const auth = await verifyAuth(req, ["vendor", "admin"]);
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
            .limit(100)
            .lean();

        // Totals per escrow state, so the vendor sees one number for
        // "when can I get paid" rather than having to sum rows.
        const totals = await VendorOrder.aggregate([
            { $match: { vendorId: new mongoose.Types.ObjectId(String(vendorId)) } },
            { $group: { _id: "$escrowStatus", amount: { $sum: "$netAmount" }, count: { $sum: 1 } } },
        ]);

        const summary = {};
        for (const t of totals) {
            summary[t._id] = { kobo: t.amount, naira: koboToNaira(t.amount), count: t.count };
        }

        const settlements = await Settlement.find({ vendorId })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        const settlementVendorOrderIds = settlements.flatMap((settlement) =>
            settlement.vendorOrderIds || []
        );
        const settlementVendorOrders = settlementVendorOrderIds.length
            ? await VendorOrder.find({
                _id: { $in: settlementVendorOrderIds },
                vendorId,
            })
                .select("orderId items")
                .lean()
            : [];
        const settlementOrderIds = [
            ...new Set(settlementVendorOrders.map((vendorOrder) => String(vendorOrder.orderId))),
        ];
        const settlementOrders = settlementOrderIds.length
            ? await Order.find({ _id: { $in: settlementOrderIds } })
                .select("orderNo customer shippingAddress")
                .populate("customer", "fullName")
                .lean()
            : [];
        const orderById = new Map(
            settlementOrders.map((order) => [String(order._id), order])
        );
        const vendorOrdersById = new Map(
            settlementVendorOrders.map((vendorOrder) => [String(vendorOrder._id), vendorOrder])
        );

        return NextResponse.json({
            success: true,
            data: {
                // Available to pay out now: released and not yet transferred.
                availableToWithdraw: summary[ESCROW.RELEASE_PENDING] || { kobo: 0, naira: 0, count: 0 },
                // Held, not yet released.
                held: summary[ESCROW.HELD] || { kobo: 0, naira: 0, count: 0 },
                disputed: summary[ESCROW.DISPUTED] || { kobo: 0, naira: 0, count: 0 },
                // Already paid out.
                settled: summary[ESCROW.RELEASED] || { kobo: 0, naira: 0, count: 0 },
                vendorOrders: vendorOrders.map((vo) => ({
                    ...vo,
                    grossAmountNaira: koboToNaira(vo.grossAmount),
                    platformFeeNaira: koboToNaira(vo.platformFee),
                    netAmountNaira: koboToNaira(vo.netAmount),
                })),
                settlements: settlements.map((s) => ({
                    ...s,
                    netAmountNaira: koboToNaira(s.netAmount),
                    amountSentNaira: koboToNaira(s.amountSent),
                    orderDetails: (s.vendorOrderIds || []).flatMap((vendorOrderId) => {
                        const vendorOrder = vendorOrdersById.get(String(vendorOrderId));
                        const order = vendorOrder
                            ? orderById.get(String(vendorOrder.orderId))
                            : null;
                        if (!vendorOrder || !order) return [];

                        return [{
                            orderNo: order.orderNo || String(order._id).slice(-8).toUpperCase(),
                            customerName:
                                order.customer?.fullName ||
                                order.shippingAddress?.fullName ||
                                "Customer",
                            products: (vendorOrder.items || []).map((item) => item.productName),
                        }];
                    }),
                })),
            },
        });
    } catch (error) {
        console.error("VENDOR SETTLEMENTS ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
