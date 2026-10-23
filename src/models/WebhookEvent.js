import mongoose from "mongoose";

// Webhook idempotency table.
//
// Paystack retries deliveries, and it does not hand us a stable event id we
// can rely on across retries. So we key on the *business fact* the event
// describes — e.g. "charge_success:REF_abc123". A second delivery of the same
// fact finds an existing row and is skipped.
//
// A row is written and its effect applied in the same transaction. Without
// that, a crash between "mark processed" and "do the work" either double-applies
// or drops the event permanently.

const webhookEventSchema = new mongoose.Schema(
    {
        provider: { type: String, default: "paystack" },
        event: { type: String, required: true }, // e.g. charge.success

        // Business-fact key, e.g. "charge_success:ps_123".
        dedupeKey: { type: String, required: true, unique: true, index: true },

        payload: { type: mongoose.Schema.Types.Mixed, default: {} },
        processedAt: { type: Date, default: () => new Date() },
    },
    { timestamps: true }
);

const WebhookEvent =
    mongoose.models.WebhookEvent || mongoose.model("WebhookEvent", webhookEventSchema);

export default WebhookEvent;
