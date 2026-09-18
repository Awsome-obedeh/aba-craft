import connectDB from "@/app/lib/connect";
import Order from "@/models/Order";
import { verifyWebhookSignature } from "@/app/lib/paystack";

export const POST = async (req) => {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!verifyWebhookSignature(rawBody, signature)) {
        console.error("Invalid Paystack webhook signature");
        return new Response("Invalid signature", { status: 401 });
    }

    let event;
    try {
        event = JSON.parse(rawBody);
    } catch {
        return new Response("Invalid JSON", { status: 400 });
    }

    const eventType = event?.event;

    if (eventType === "charge.success") {
        const data = event?.data || {};
        const reference = data?.reference;

        if (reference) {
            try {
                await connectDB();
                const order = await Order.findOne({ paymentRef: reference });

                if (order && order.paymentStatus !== "paid") {
                    order.paymentStatus = "paid";
                    order.status = "paid";
                    order.paidAt = new Date();
                    await order.save();
                }
            } catch (error) {
                console.error("Webhook order update error:", error);
            }
        }
    }

    return new Response("OK", { status: 200 });
};
