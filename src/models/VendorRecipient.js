import mongoose from "mongoose";

// A vendor's verified bank account, used to build Paystack transfers.
//
// Vendors cannot be fully verified (and therefore cannot sell) without one —
// otherwise we could accept their money and have no way to pay them back.
// The vendor verification flow gates on `verifiedAt`.

const vendorRecipientSchema = new mongoose.Schema(
    {
        vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },

        bankCode: { type: String, required: true, trim: true },
        accountNumber: { type: String, required: true, trim: true },
        accountName: { type: String, required: true, trim: true },

        // Created via POST /transfer/recipient and re-verified on change.
        // Single-use codes in Paystack, so we regenerate per payout.
        paystackRecipientCode: { type: String, default: "" },
        verifiedAt: { type: Date },
        verificationFailureReason: { type: String, default: "" },
    },
    { timestamps: true }
);

const VendorRecipient =
    mongoose.models.VendorRecipient || mongoose.model("VendorRecipient", vendorRecipientSchema);

export default VendorRecipient;
