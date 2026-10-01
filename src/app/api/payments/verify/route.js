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
        // `status === "success"` is Paystack's canonical success signal for a
        // charge. The previous check also required revenue_status === "settled",
        // which relates to revenue splitting, not to whether funds were captured,
        // and produced false negatives.
        const isSuccess = txData.status === "success";

        const order = await Order.findOne({ paymentRef: reference });

        if (isSuccess) {
            if (order && order.paymentStatus !== "paid") {
                // This route is a convenience for the customer's browser after a
                // redirect. It is NOT the source of truth — the charge.success
                // webhook is. We only mark the order paid here when the webhook
                // has not arrived yet; the webhook's own idempotency key makes
                // the later arrival a no-op, and the escrow hold is created by
                // whichever runs first.
                const { holdEscrowForOrder } = await import("@/app/lib/escrowHold");
                await holdEscrowForOrder(order, reference, { createdBy: "system:verify-fallback" });
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
