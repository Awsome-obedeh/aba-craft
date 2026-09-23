// POST /api/orders  — create order (auth required: customer, vendor, or admin)
// GET  /api/orders  — list orders scoped to the caller
//
//   - signed-in customer  → their own orders
//   - signed-in vendor    → orders that contain at least one of their products
//   - signed-in admin     → all orders

import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Order from "@/models/Order";
import Product from "@/models/Products";
import { computeFinalUnitPrice, computeTotals } from "@/app/lib/orderPricing";
import { NextResponse } from "next/server";

const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id));

export const POST = async (req) => {
    // Accounts are required to place an order
    const auth = await verifyAuth(req, ["customer", "vendor", "admin"]);
    if (!auth.isValid) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
    }

    try {
        await connectDB();

        const body = await req.json();
        const { items, shippingAddress, paymentMethod } = body || {};

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ success: false, message: "Cart is empty" }, { status: 400 });
        }
        if (!shippingAddress?.fullName || !shippingAddress?.phone || !shippingAddress?.addressLine || !shippingAddress?.city || !shippingAddress?.state) {
            return NextResponse.json({ success: false, message: "Shipping address is incomplete" }, { status: 400 });
        }

        const customerId = auth.user.id;

        // Hydrate items against the live DB so we never trust the client's price
        const productIds = items.map(i => i.productId).filter(isValidObjectId);
        if (productIds.length !== items.length) {
            return NextResponse.json({ success: false, message: "Invalid product id" }, { status: 400 });
        }
        const products = await Product.find({ _id: { $in: productIds }, isActive: true }).lean();
        const productMap = new Map(products.map(p => [String(p._id), p]));

        const lineItems = [];
        for (const item of items) {
            const product = productMap.get(String(item.productId));
            if (!product) {
                return NextResponse.json(
                    { success: false, message: `Product no longer available: ${item.productId}` },
                    { status: 409 }
                );
            }
            const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
            if (qty > product.quantity) {
                return NextResponse.json(
                    { success: false, message: `Only ${product.quantity} of "${product.productName}" left in stock` },
                    { status: 409 }
                );
            }
            lineItems.push({
                product: product._id,
                productName: product.productName,
                productImage: (product.productImages && product.productImages[0]) || "",
                unitPrice: Number(product.price) || 0,                // snapshot of base
                discountPrice: Number(product.discountPrice) || 0,
                discountPercentage: Number(product.discountPercentage) || 0,
                finalUnitPrice: computeFinalUnitPrice(product),
                quantity: qty,
                vendor: product.createdBy,
            });
        }

        const totals = computeTotals(lineItems);

        const order = await Order.create({
            customer: customerId,
            items: lineItems.map(({ discountPrice, discountPercentage, ...rest }) => rest),
            shippingAddress,
            subtotal: totals.subtotal,
            shippingFee: totals.shippingFee,
            total: totals.total,
            paymentMethod: paymentMethod === "paystack" ? "paystack" : "mock",
            status: "pending_payment",
            paymentStatus: "pending",
        });

        return NextResponse.json({ success: true, data: order }, { status: 201 });
    } catch (error) {
        console.error("ORDER CREATE ERROR:", error);
        return NextResponse.json({ success: false, message: "Server error creating order" }, { status: 500 });
    }
};

export const GET = async (req) => {
    const auth = await verifyAuth(req, ["customer", "vendor", "admin"]);
    if (!auth.isValid) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
    }

    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
        const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit")) || 10));
        const skip = (page - 1) * limit;

        let query = {};
        if (auth.user.role === "customer") {
            query.customer = auth.user.id;
        } else if (auth.user.role === "vendor") {
            query["items.vendor"] = auth.user.id;
        }
        // admin: no filter

        const [orders, total] = await Promise.all([
            Order.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Order.countDocuments(query),
        ]);

        return NextResponse.json({
            success: true,
            data: orders,
            pagination: {
                totalItems: total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                limit,
            },
        });
    } catch (error) {
        console.error("ORDER LIST ERROR:", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
};
