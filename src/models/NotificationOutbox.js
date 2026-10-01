import mongoose from "mongoose";

// Notification outbox.
//
// Emails are NOT sent inline from the webhook or escrow transition. If SMTP is
// briefly down, an inline send would either roll back a successful payment or
// lose the notification permanently. Instead every transition enqueues a row
// here, and a cron job drains the queue with retries.
//
// This is the "transactional outbox" pattern: the state change and the intent
// to notify are recorded together, and delivery happens out of band.

const outboxSchema = new mongoose.Schema(
    {
        // Where to send it.
        to: { type: String, required: true },
        recipientName: { type: String, default: "" },
        role: { type: String, enum: ["vendor", "customer", "admin"], required: true },

        template: {
            type: String,
            required: true,
            enum: [
                "order_paid_to_vendor",
                "delivered_confirm_receipt",
                "auto_release_warning",
                "settlement_paid",
                "dispute_opened",
            ],
        },

        // Template variables, in kobo where they are money.
        data: { type: mongoose.Schema.Types.Mixed, default: {} },

        // What this notification is about, for dedupe and traceability.
        vendorOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "VendorOrder", index: true },
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", index: true },

        // Must be a declared field — Mongoose strips undeclared paths in strict
        // mode, which would silently defeat the dedupe index below.
        // e.g. "delivered_confirm_receipt:vo_6a2a..."
        dedupeKey: { type: String },

        status: {
            type: String,
            enum: ["pending", "sent", "failed"],
            default: "pending",
            index: true,
        },
        attempts: { type: Number, default: 0 },
        lastError: { type: String, default: "" },
        sentAt: { type: Date },
        nextAttemptAt: { type: Date, index: true },
    },
    { timestamps: true }
);

// Stop the same notification being queued twice for the same event, e.g. if a
// webhook is retried. Keyed on the business fact, like the ledger.
outboxSchema.index(
    { dedupeKey: 1 },
    { unique: true, sparse: true }
);
outboxSchema.index({ status: 1, nextAttemptAt: 1 });

const NotificationOutbox =
    mongoose.models.NotificationOutbox || mongoose.model("NotificationOutbox", outboxSchema);

export default NotificationOutbox;
