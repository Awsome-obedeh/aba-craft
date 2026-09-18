import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Order from "@/models/Order";
import { NextResponse } from "next/server";
import { paystackRequest, toKobo, PAYSTACK_CALLBACK_URL } from "@/app/lib/paystack";

const generateReference = () =>
    `ps_${Date.now()}_${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

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

        const { orderId } = await req.json();
        if (!orderId) {
            return NextResponse.json(
                { success: false, message: "orderId is required" },
                { status: 400 }
            );
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return NextResponse.json(
                { success: false, message: "Order not found" },
                { status: 404 }
            );
        }

        if (auth.user.role !== "admin" && String(order.customer) !== String(auth.user.id)) {
            return NextResponse.json(
                { success: false, message: "Forbidden" },
                { status: 403 }
            );
        }

        if (order.paymentStatus === "paid") {
            return NextResponse.json(
                {
                    success: false,
                    message: "Order already paid",
                    alreadyPaid: true,
                },
                { status: 409 }
            );
        }

        const reference = order.paymentRef || generateReference();
        order.paymentRef = reference;
        order.paymentMethod = "paystack";
        await order.save();

        const payload = {
            email: auth.user.email,
            amount: toKobo(order.total),
            reference,
            callback_url: PAYSTACK_CALLBACK_URL,
            metadata: {
                order_id: String(order._id),
                customer_id: String(order.customer),
            },
            channels: ["card", "bank_transfer", "ussd", "mobile_money"],
        };

        const { ok, status, data: psData } = await paystackRequest(
            "/transaction/initialize",
            {
                method: "POST",
                body: JSON.stringify(payload),
            }
        );

        if (!ok || !psData?.data?.authorization_url) {
            console.error("Paystack initialize failed:", psData);
            return NextResponse.json(
                {
                    success: false,
                    message: psData?.message || "Failed to initialize Paystack transaction",
                    error: psData,
                },
                { status: status >= 400 ? status : 502 }
            );
        }

        return NextResponse.json({
            success: true,
            reference: psData.data.reference,
            accessCode: psData.data.access_code,
            authorizationUrl: psData.data.authorization_url,
            amount: order.total,
        });
    } catch (error) {
        console.error("PAYSTACK INIT ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Server error initializing payment" },
            { status: 500 }
        );
    }
};
