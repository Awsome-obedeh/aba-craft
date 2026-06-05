// POST /api/payments/mock/init
//   body: { orderId }
//   returns: { reference, authorizationUrl, amount }
//
// This is a stand-in for Paystack's `transaction/initialize`. The returned
// `authorizationUrl` is a route on THIS app (/checkout/mock-pay?ref=...) that
// simulates the hosted checkout. When the user clicks "Pay", we POST to
// /api/payments/mock/verify which marks the order paid.

import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Order from "@/models/Order";
import { NextResponse } from "next/server";

const generateRef = () => `MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export const POST = async (req) => {
    const auth = await verifyAuth(req, ["customer", "vendor", "admin"]);
    if (!auth.isValid) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
    }

    try {
        await connectDB();
        const { orderId } = await req.json();
        if (!orderId) {
            return NextResponse.json({ success: false, message: "orderId required" }, { status: 400 });
        }
        const order = await Order.findById(orderId);
        if (!order) return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
        // Only the order's customer (or admin) can start payment on it
        if (auth.user.role !== "admin" && String(order.customer) !== String(auth.user.id)) {
            return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
        }
        if (order.paymentStatus === "paid") {
            return NextResponse.json({ success: false, message: "Order already paid" }, { status: 409 });
        }

        const reference = generateRef();
        order.paymentRef = reference;
        order.paymentMethod = "mock";
        await order.save();

        return NextResponse.json({
            success: true,
            reference,
            authorizationUrl: `/checkout/mock-pay?ref=${reference}&order=${orderId}`,
            amount: order.total,
        });
    } catch (error) {
        console.error("MOCK PAY INIT ERROR:", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
};
