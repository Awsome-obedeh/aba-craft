// /api/orders/[id]
//   GET   — order detail (customer owner OR vendor whose product is in it OR admin)
//   PATCH — vendor (their own orders) or admin updates `status` / `vendorNote`

import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Order from "@/models/Order";
import { NextResponse } from "next/server";

export const GET = async (req, { params }) => {
    const auth = await verifyAuth(req, ["customer", "vendor", "admin"]);
    if (!auth.isValid) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
    }

    try {
        await connectDB();
        const { id } = await params;
        const order = await Order.findById(id).lean();
        if (!order) {
            return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
        }

        const role = auth.user.role;
        const userId = String(auth.user.id);
        const isOwner = order.customer && String(order.customer) === userId;
        const isVendor = role === "vendor" && order.items.some(i => String(i.vendor) === userId);
        const isAdmin = role === "admin";

        if (!isOwner && !isVendor && !isAdmin) {
            return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json({ success: true, data: order });
    } catch (error) {
        console.error("ORDER GET ERROR:", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
};

const ALLOWED_STATUS_TRANSITIONS = {
    pending_payment: ["paid", "cancelled"],
    paid: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
};

export const PATCH = async (req, { params }) => {
    const auth = await verifyAuth(req, ["vendor", "admin"]);
    if (!auth.isValid) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
    }

    try {
        await connectDB();
        const { id } = await params;
        const body = await req.json();
        const { status, vendorNote } = body || {};

        const order = await Order.findById(id);
        if (!order) {
            return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
        }

        // Vendors can only act on orders that contain their products
        if (auth.user.role === "vendor") {
            const ownsItem = order.items.some(i => String(i.vendor) === String(auth.user.id));
            if (!ownsItem) {
                return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
            }
        }

        if (status) {
            const allowed = ALLOWED_STATUS_TRANSITIONS[order.status] || [];
            if (!allowed.includes(status)) {
                return NextResponse.json(
                    { success: false, message: `Cannot transition from ${order.status} to ${status}` },
                    { status: 400 }
                );
            }
            order.status = status;
            if (status === "cancelled" && order.paymentStatus === "paid") {
                order.paymentStatus = "refunded";
            }
        }
        if (typeof vendorNote === "string") {
            order.vendorNote = vendorNote.trim().slice(0, 1000);
        }

        await order.save();
        return NextResponse.json({ success: true, data: order });
    } catch (error) {
        console.error("ORDER PATCH ERROR:", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
};
