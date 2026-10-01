import mongoose from "mongoose";

// A Settlement batches one or more released vendor orders into a single
// Paystack transfer to that vendor's bank account.
//
// Batching matters: Paystack charges a fee per transfer, so paying a vendor
// once for 12 small orders is far cheaper than 12 transfers. The Settlement
// is also the unit of retry — if a transfer fails we retry the whole batch.
//
// All money is integer kobo.

const settlementSchema = new mongoose.Schema(
    {
        vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

        // The vendor orders this settlement pays out. Populated when the
        // settlement is created, not retro-fitted.
        vendorOrderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "VendorOrder" }],

        grossAmount: { type: Number, required: true, min: 0 },
        platformFee: { type: Number, required: true, min: 0 },
        // Paystack's own transfer fee. Deducted from the payout, so the vendor
        // receives netAmount - paystackFee.
        paystackFee: { type: Number, default: 0, min: 0 },
        netAmount: { type: Number, required: true, min: 0 }, // owed to the vendor
        amountSent: { type: Number, default: 0, min: 0 }, // actually transferred

        status: {
            type: String,
            enum: ["pending", "processing", "paid", "failed", "cancelled"],
            default: "pending",
            index: true,
        },

        // Paystack transfer plumbing.
        recipientCode: { type: String, default: "" },
        transferCode: { type: String, default: "", index: true },
        transferReference: { type: String, default: "" },
        transferStatus: { type: String, default: "" },
        failureReason: { type: String, default: "" },

        // Retries. Paystack failures are usually transient (funds not yet
        // settled, bank downtime), so we back off rather than give up.
        attempts: { type: Number, default: 0 },
        nextRetryAt: { type: Date, index: true },

        scheduledFor: { type: Date },
        processedAt: { type: Date },

        // Which actor/system initiated the payout.
        triggeredBy: { type: String, default: "system:process-settlements" },

        // Append-only audit trail. A payout can be retried or manually revived
        // several times, and each of those is an event someone needs to be able
        // to reconstruct — the current `status` only shows where it ended up.
        statusLog: [
            {
                at: { type: Date, default: Date.now },
                event: { type: String, required: true },
                by: { type: String, default: "system" },
            },
        ],
    },
    { timestamps: true }
);

settlementSchema.index({ status: 1, scheduledFor: 1 });
settlementSchema.index({ vendorId: 1, createdAt: -1 });

const Settlement =
    mongoose.models.Settlement || mongoose.model("Settlement", settlementSchema);

export default Settlement;
