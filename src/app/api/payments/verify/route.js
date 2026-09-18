import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Order from "@/models/Order";
import { NextResponse } from "next/server";
import { paystackRequest, fromKobo } from "@/app/lib/paystack";

export const POST = async (req) => {
    const auth = await verifyAuth(req, ["customer", "vendor", "admin"]);
    if (!auth.isValid) {
        return NextResponse.json(
            { success: false, message: auth.message },
            { status: auth.status }
        );
    }

    try {
        await connectDB();

        const { reference } = await req.json();
        if (!reference) {
            return NextResponse.json(
                { success: false, message: "reference is required" },
                { status: 400 }
            );
        }

        const { ok, status, data: psData } = await paystackRequest(
            `/transaction/verify/${reference}`,
            { method: "GET" }
        );

        if (!ok) {
            return NextResponse.json(
                {
                    success: false,
                    message: psData?.message || "Failed to verify transaction",
                    error: psData,
                },
                { status: status >= 400 ? status : 502 }
            );
        }

        const txData = psData?.data || {};
        const isSuccess = txData.status === "success" && txData.revenue_status === "settled";

        const order = await Order.findOne({ paymentRef: reference });

        if (isSuccess) {
            if (order) {
                order.paymentStatus = "paid";
                order.status = "paid";
                order.paidAt = new Date();
                await order.save();
            }

            return NextResponse.json({
                success: true,
                message: "Payment verified successfully",
                reference: txData.reference,
                amount: txData.amount ? fromKobo(txData.amount) : null,
                orderId: order ? String(order._id) : null,
            });
        }

        if (order && order.paymentStatus === "pending") {
            order.paymentStatus = "failed";
            await order.save();
        }

        return NextResponse.json({
            success: false,
            message: `Payment verification returned status: ${txData.status || "unknown"}`,
            reference: txData.reference,
            amount: txData.amount ? fromKobo(txData.amount) : null,
        });
    } catch (error) {
        console.error("PAYSTACK VERIFY ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Server error verifying payment" },
            { status: 500 }
        );
    }
};
