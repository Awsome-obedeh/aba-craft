import mongoose from "mongoose";

// A VendorOrder is the per-vendor slice of an Order.
//
// One customer Order can contain products from several vendors, but Paystack
// takes a single payment for the whole basket. VendorOrder is where we split:
// each one holds its own money, its own fulfilment state, and its own escrow
// state, so one vendor shipping early never implies the whole order shipped.
//
// All money here is integer kobo.

export const ESCROW = {
    NONE: "none",
    HELD: "held",
    RELEASE_PENDING: "release_pending",
    RELEASED: "released",
    REFUNDED: "refunded",
    DISPUTED: "disputed",
};

export const FULFILLMENT = {
    PENDING: "pending",
    PROCESSING: "processing",
    SHIPPED: "shipped",
    DELIVERED: "delivered",
    CANCELLED: "cancelled",
};

// Legal fulfilment steps. ESCROW deliberately has no "received" state —
// receipt is a timestamp, and "completed" is just escrowStatus === released.
const FULFILLMENT_TRANSITIONS = {
    [FULFILLMENT.PENDING]: [FULFILLMENT.PROCESSING, FULFILLMENT.CANCELLED],
    [FULFILLMENT.PROCESSING]: [FULFILLMENT.SHIPPED, FULFILLMENT.CANCELLED],
    [FULFILLMENT.SHIPPED]: [FULFILLMENT.DELIVERED, FULFILLMENT.CANCELLED],
    [FULFILLMENT.DELIVERED]: [],
    [FULFILLMENT.CANCELLED]: [],
};

const vendorItemSchema = new mongoose.Schema(
    {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        productName: { type: String, required: true }, // snapshot
        productImage: { type: String, default: "" }, // snapshot
        unitPrice: { type: Number, required: true, min: 0 }, // snapshot, kobo
        quantity: { type: Number, required: true, min: 1 },
    },
    { _id: false }
);

const vendorOrderSchema = new mongoose.Schema(
    {
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
        vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

        items: { type: [vendorItemSchema], required: true },

        // --- Money, in kobo -------------------------------------------------
        // gross = what the customer paid for this vendor's items
        // platformFee = Aba Crafts commission taken at payment time
        // net = what the vendor will receive (gross - platformFee)
        grossAmount: { type: Number, required: true, min: 0 },
        platformFee: { type: Number, required: true, min: 0, default: 0 },
        netAmount: { type: Number, required: true, min: 0 },

        platformFeeBps: { type: Number, default: 0 }, // snapshot of the rate used

        // --- State ----------------------------------------------------------
        fulfillmentStatus: {
            type: String,
            enum: Object.values(FULFILLMENT),
            default: FULFILLMENT.PENDING,
            index: true,
        },
        escrowStatus: {
            type: String,
            enum: Object.values(ESCROW),
            default: ESCROW.NONE,
            index: true,
        },
        disputeStatus: {
            type: String,
            enum: ["none", "open", "resolved"],
            default: "none",
            index: true,
        },

        // --- Confirmations (the two gates on release) ----------------------
        vendorConfirmedDeliveryAt: { type: Date },
        customerConfirmedReceiptAt: { type: Date },

        // Optional delivery evidence from the vendor.
        deliveryProofUrl: { type: String, default: "" },
        trackingNumber: { type: String, default: "" },

        // When the auto-release job may release without customer confirmation.
        // Cleared whenever a dispute opens.
        autoReleaseAt: { type: Date, index: true },

        releasedAt: { type: Date },
        releaseRequestedAt: { type: Date },
        releaseRequestedBy: { type: String, default: "" },
        settlementId: { type: mongoose.Schema.Types.ObjectId, ref: "Settlement" },

        // Append-only audit trail. Every state transition appends a line, so an
        // admin can reconstruct exactly who moved the order and when. For money
        // movement this replaces the free-text `adminNotes` pattern.
        statusLog: [
            {
                at: { type: Date, default: Date.now },
                event: { type: String, required: true },
                by: { type: String, default: "system" },
                note: { type: String, default: "" },
            },
        ],

        // --- Dispute --------------------------------------------------------
        disputeReason: { type: String, default: "" },
        disputeResolution: { type: String, default: "" },
        disputedAt: { type: Date },
        resolvedAt: { type: Date },
        resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

        // Partial-dispute bookkeeping, in integer kobo. On a partial resolution
        // `netAmount` is reduced to the vendor's remaining share, so the
        // original escrowed figure has to be preserved here or the audit trail
        // loses the amount the customer was actually refunded out of.
        disputedNetAmount: { type: Number, min: 0 },
        partialRefundKobo: { type: Number, min: 0 },
    },
    { timestamps: true }
);

// One VendorOrder per vendor per order.
vendorOrderSchema.index({ orderId: 1, vendorId: 1 }, { unique: true });
// Supports the auto-release job's scan: escrow held, deadline passed, no dispute.
vendorOrderSchema.index({ escrowStatus: 1, autoReleaseAt: 1 });
vendorOrderSchema.index({ escrowStatus: 1, vendorId: 1, createdAt: -1 });

const VendorOrder = mongoose.models.VendorOrder || mongoose.model("VendorOrder", vendorOrderSchema);

export default VendorOrder;
export { FULFILLMENT_TRANSITIONS };

/** Returns true when `to` is a legal fulfilment step from `from`. */
export function canTransitionFulfillment(from, to) {
    return (FULFILLMENT_TRANSITIONS[from] || []).includes(to);
}
