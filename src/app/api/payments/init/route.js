import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Order from "@/models/Order";
import { NextResponse } from "next/server";
import { paystackRequest, toKobo, PAYSTACK_CALLBACK_URL, PAYSTACK_SECRET_KEY } from "@/app/lib/paystack";

// Paystack rejects a transaction whose reference has already been used, so
// every payment attempt needs its own reference.
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

        if (!PAYSTACK_SECRET_KEY) {
            console.error("PAYSTACK INIT ERROR: PAYSTACK_SECRET_KEY is not configured");
            return NextResponse.json(
                { success: false, message: "Payments are not configured yet" },
                { status: 503 }
            );
        }

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

        // An order that has already been paid, refunded or cancelled is not
        // payable again. A pending or failed payment is — that is the retry
        // path from the customer's orders page.
        const payable =
            order.status === "pending_payment" &&
            (order.paymentStatus === "pending" || order.paymentStatus === "failed");
        if (!payable) {
            return NextResponse.json(
                { success: false, message: "This order can no longer be paid" },
                { status: 409 }
            );
        }

        if (order.total <= 0) {
            return NextResponse.json(
                { success: false, message: "Order total must be greater than zero" },
                { status: 400 }
            );
        }

        // A fresh reference per attempt. The previous one is dropped: Paystack
        // will not accept a reused reference, and a late webhook for an
        // abandoned attempt is picked up by the reconcile job instead of
        // crediting escrow against a reference the order no longer knows.
        const reference = generateReference();
        order.paymentRef = reference;
        order.paymentMethod = "paystack";
        order.paymentStatus = "pending";
        await order.save();

        const payload = {
            email: auth.user.email,
            amount: toKobo(order.total),
            reference,
            callback_url: PAYSTACK_CALLBACK_URL || undefined,
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
            // The order now carries a reference for a transaction that was
            // never created, so clear it — the next attempt must start clean.
            order.paymentRef = "";
            await order.save();
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
            orderId: String(order._id),
        });
    } catch (error) {
        console.error("PAYSTACK INIT ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Server error initializing payment" },
            { status: 500 }
        );
    }
};
