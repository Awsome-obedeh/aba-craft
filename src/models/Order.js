import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        productName: { type: String, required: true },   // snapshot
        productImage: { type: String, default: "" },    // snapshot
        unitPrice: { type: Number, required: true },     // snapshot (final price paid)
        quantity: { type: Number, required: true, min: 1 },
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        addressLine: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        notes: { type: String, default: "", trim: true },
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        // Customer — required: all orders must be placed by a signed-in user.
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Customer is required"],
            index: true,
        },

        items: { type: [orderItemSchema], required: true, validate: v => v.length > 0 },

        shippingAddress: { type: shippingAddressSchema, required: true },

        // Money (in NGN, kobo-equivalent: just store naira as a float for v1)
        subtotal: { type: Number, required: true, min: 0 },
        shippingFee: { type: Number, required: true, min: 0, default: 0 },
        total: { type: Number, required: true, min: 0 },

        // Payment — mocked for v1, structured for real Paystack later
        paymentMethod: {
            type: String,
            enum: ["paystack", "mock"],
            default: "mock",
        },
        paymentRef: {
            type: String,
            default: "",
            index: true,
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed", "refunded"],
            default: "pending",
            index: true,
        },
        paidAt: { type: Date },

        // Order lifecycle — vendor drives this
        status: {
            type: String,
            enum: [
                "pending_payment",
                "paid",
                "processing",
                "shipped",
                "delivered",
                "cancelled",
            ],
            default: "pending_payment",
            index: true,
        },

        // Vendor note shown to customer
        vendorNote: { type: String, default: "" },
    },
    { timestamps: true }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ customer: 1, createdAt: -1 });

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

export default Order;
