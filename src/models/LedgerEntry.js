import mongoose from "mongoose";

// Append-only double-entry ledger.
//
// Each entry carries `lines`, where every line names an account and posts
// either a debit or a credit. This is a real journal entry rather than a
// simple transfer record, so a single entry can express the platform-fee split:
//
//   payment_received  (order total 10,000)
//     DR PAYSTACK_CLEARING    10,000
//     CR ESCROW_LIABILITY      9,000
//     CR PLATFORM_REVENUE      1,000
//
// Rules:
//   - Amounts are integer kobo. Never floats.
//   - Every entry must balance: sum(debits) === sum(credits).
//   - Entries are never updated or deleted. To correct one, post a `reversal`
//     entry that references the original. This keeps the ledger auditable.

export const LEDGER_TYPES = {
    PAYMENT_RECEIVED: "payment_received", // money in from Paystack, split into escrow + revenue
    ESCROW_RELEASE: "escrow_release", // escrow held -> vendor payable
    PAYOUT: "payout", // vendor payable -> money out via Paystack transfer
    REFUND: "refund", // money back out to a customer
    REVERSAL: "reversal", // correcting entry, points at reverses
};

const lineSchema = new mongoose.Schema(
    {
        account: { type: String, required: true },
        debit: { type: Number, default: 0, min: 0 },
        credit: { type: Number, default: 0, min: 0 },
    },
    { _id: false }
);

const ledgerEntrySchema = new mongoose.Schema(
    {
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", index: true },
        vendorOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "VendorOrder", index: true },
        settlementId: { type: mongoose.Schema.Types.ObjectId, ref: "Settlement", index: true },
        vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

        type: { type: String, enum: Object.values(LEDGER_TYPES), required: true, index: true },

        currency: { type: String, default: "NGN" },

        lines: {
            type: [lineSchema],
            required: true,
            validate: {
                validator: (v) => Array.isArray(v) && v.length >= 2,
                message: "A ledger entry needs at least two lines",
            },
        },

        paystackReference: String,
        description: String,

        // The business fact this entry records, e.g. "charge_success:REF_123".
        // Must be a real schema field — Mongoose strips undeclared paths in
        // strict mode, which would silently defeat idempotency.
        idempotencyKey: { type: String },

        // Who caused this entry. Either an admin user id or a system actor
        // like "system:auto-release" / "system:charge_success".
        createdBy: { type: String, default: "system" },

        // Set on reversal entries to point at the entry being corrected.
        reverses: { type: mongoose.Schema.Types.ObjectId, ref: "LedgerEntry" },
    },
    { timestamps: true }
);

// The idempotency key is what makes a retried webhook safe. Paystack does not
// send a stable event id across retries, so we key on the business fact
// instead: "charge_success:REF_123", "payout:TRF_456".
ledgerEntrySchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
ledgerEntrySchema.index({ orderId: 1, createdAt: -1 });
ledgerEntrySchema.index({ createdAt: -1 });

const LedgerEntry =
    mongoose.models.LedgerEntry || mongoose.model("LedgerEntry", ledgerEntrySchema);

export default LedgerEntry;
