// POST /api/payments/mock/verify
//   body: { reference }
//   returns: { success, orderId, status }
//
// Marks the matching order as paid. In real Paystack, this would call
// `https://api.paystack.co/transaction/verify/{reference}` and validate the
// signature. Here we just trust the reference because there is no gateway.

import connectDB from "@/app/lib/connect";
import Order from "@/models/Order";
import { NextResponse } from "next/server";

export const POST = async (req) => {
    try {
        await connectDB();
        const { reference, outcome } = await req.json();
        if (!reference) {
            return NextResponse.json({ success: false, message: "reference required" }, { status: 400 });
        }

        const order = await Order.findOne({ paymentRef: reference });
        if (!order) {
            return NextResponse.json({ success: false, message: "Unknown reference" }, { status: 404 });
        }
        if (order.paymentStatus === "paid") {
            return NextResponse.json({ success: true, orderId: String(order._id), status: order.status, alreadyPaid: true });
        }

        if (outcome === "fail") {
            order.paymentStatus = "failed";
            await order.save();
            return NextResponse.json({ success: false, orderId: String(order._id), status: order.status });
        }

        order.paymentStatus = "paid";
        order.status = "paid";
        order.paidAt = new Date();
        await order.save();

        return NextResponse.json({ success: true, orderId: String(order._id), status: order.status });
    } catch (error) {
        console.error("MOCK PAY VERIFY ERROR:", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
};
