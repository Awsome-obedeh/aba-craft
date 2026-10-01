import nodemailer from "nodemailer";
import NotificationOutbox from "@/models/NotificationOutbox";
import { koboToNaira } from "@/app/lib/money";

// Notifications for the escrow flow.
//
// Four events, as specified:
//
//   1. Vendor:    "Order paid, please deliver."
//   2. Customer:  "Vendor marked delivered. Please confirm receipt."
//   3. Customer:  "Funds release automatically in N days unless you dispute."
//   4. Vendor:    "Your settlement has been paid."
//
// Enqueue only. Delivery happens in the outbox worker (see
// /api/jobs/process-notifications), because sending inline from a webhook
// would let a flaky SMTP server roll back or block a successful payment.
//
// A shared transporter is created lazily and reused; creating one per email
// opens a new connection pool every time.

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    transporter = nodemailer.createTransport({
        service: process.env.EMAIL_HOST,
        port: 465,
        auth: {
            user: process.env.EMAIL_ADDRESS,
            pass: process.env.EMAIL_APP_PASSWORD,
        },
        tls: { rejectUnauthorized: false },
    });

    return transporter;
}

const naira = (kobo) =>
    `₦${koboToNaira(kobo || 0).toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

function layout(title, bodyHtml, cta) {
    const ctaBlock = cta
        ? `<a href="${cta.url}" target="_blank" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#000;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">${cta.label}</a>`
        : "";

    return `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;line-height:1.5;color:#1e293b">
        <h2 style="margin:0 0 12px">${title}</h2>
        ${bodyHtml}
        ${ctaBlock}
        <p style="margin-top:32px;color:#94a3b8;font-size:11px">
          You are receiving this because of an order on Aba Crafts.
        </p>
      </div>`;
}

function amountBox(label, kobo) {
    return `
      <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0">
        <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.05em">${label}</p>
        <p style="margin:4px 0 0;font-size:22px;font-weight:700">${naira(kobo)}</p>
      </div>`;
}

/** Render a template into { subject, html }. */
function render(template, data) {
    const base = process.env.FRONT_END_URL || "http://localhost:3000";

    switch (template) {
        case "order_paid_to_vendor":
            return {
                subject: `Order paid — please deliver (#${String(data.orderId || "").slice(-8).toUpperCase()})`,
                html: layout(
                    "You have a paid order",
                    `<p>Good news — a customer has paid for your item and the money is now held in escrow on your behalf.</p>
                     ${amountBox("You will receive", data.netAmount)}
                     <p>Once you mark the order delivered and the customer confirms receipt, the funds are released to your payout account. If they do not respond, it releases automatically after ${data.autoReleaseDays || 7} days.</p>`,
                    { label: "View the order", url: `${base}/dashboard/vendor/orders` }
                ),
            };

        case "delivered_confirm_receipt":
            return {
                subject: "Your order was delivered — please confirm receipt",
                html: layout(
                    "Did you receive your order?",
                    `<p>The vendor has marked your order as delivered. If everything looks right, please confirm receipt so the vendor can be paid.</p>
                     ${amountBox("Order total", data.totalAmount)}
                     <p>If the item is damaged, incorrect, or never arrived, open a dispute instead — that freezes the payment while we sort it out.</p>`,
                    { label: "Confirm or dispute", url: `${base}/account/orders` }
                ),
            };

        case "auto_release_warning":
            return {
                subject: "Your order will be released to the vendor soon",
                html: layout(
                    "Payment releasing automatically",
                    `<p>You have not confirmed receipt of this order, so the payment will be released to the vendor automatically in <strong>${data.daysRemaining || 1} day(s)</strong>.</p>
                     ${amountBox("Order total", data.totalAmount)}
                     <p>If you have not received the item, or something is wrong, open a dispute now and the release will stop.</p>`,
                    { label: "Review my order", url: `${base}/account/orders` }
                ),
            };

        case "settlement_paid":
            return {
                subject: `Payout sent — ${naira(data.netAmount)}`,
                html: layout(
                    "Your payout has been sent",
                    `<p>Your settlement has been paid out to your registered bank account.</p>
                     ${amountBox("Amount sent", data.netAmount)}
                     ${data.coveredOrders ? `<p>Covering ${data.coveredOrders} completed order(s).</p>` : ""}
                     ${data.paystackFee ? `<p style="font-size:13px;color:#64748b">A transfer fee of ${naira(data.paystackFee)} was deducted by Paystack.</p>` : ""}`,
                    { label: "View settlement history", url: `${base}/dashboard/vendor/settlements` }
                ),
            };

        case "dispute_opened":
            return {
                subject: "A dispute was opened on your order",
                html: layout(
                    "Payment on hold",
                    `<p>A customer has opened a dispute, so the payment for this order is frozen while we review it. No payout will be made until an admin resolves it.</p>
                     ${amountBox("Amount on hold", data.netAmount)}
                     ${data.reason ? `<p><strong>Reason given:</strong> ${data.reason}</p>` : ""}`,
                    null
                ),
            };

        default:
            return { subject: "Aba Crafts notification", html: layout("Notification", "<p>You have a new update.</p>") };
    }
}

/**
 * Queue a notification. Never throws — a failure to enqueue must never break
 * the escrow transition that triggered it.
 *
 * @param {object} params
 * @param {string} params.to
 * @param {string} params.role        vendor | customer | admin
 * @param {string} params.template    one of the schema's templates
 * @param {object} [params.data]      template variables
 * @param {string} [params.dedupeKey] business-fact key, e.g. "settlement_paid:stl_1"
 */
export async function enqueueNotification({ to, role, template, data = {}, dedupeKey, vendorOrderId, orderId }) {
    if (!to) return null;

    try {
        const payload = {
            to,
            role,
            template,
            data,
            dedupeKey,
            vendorOrderId,
            orderId,
            status: "pending",
            nextAttemptAt: new Date(),
        };

        // Dedupe: a retried webhook must not queue the same email twice.
        if (dedupeKey) {
            const existing = await NotificationOutbox.findOne({ dedupeKey });
            if (existing) return existing;
        }

        try {
            return await NotificationOutbox.create(payload);
        } catch (err) {
            if (err?.code === 11000 && dedupeKey) {
                return NotificationOutbox.findOne({ dedupeKey });
            }
            throw err;
        }
    } catch (error) {
        console.error("Failed to enqueue notification:", error);
        return null;
    }
}

const MAX_ATTEMPTS = 3;

/**
 * Drain the outbox. Claims rows one at a time so concurrent cron invocations
 * cannot send the same email twice.
 */
export async function processOutbox({ limit = 25 } = {}) {
    const result = { attempted: 0, sent: 0, failed: 0, errors: [] };

    for (let i = 0; i < limit; i++) {
        // Claim atomically: only one worker can move a row out of "pending".
        const claimed = await NotificationOutbox.findOneAndUpdate(
            {
                status: { $in: ["pending", "failed"] },
                nextAttemptAt: { $lte: new Date() },
                attempts: { $lt: MAX_ATTEMPTS },
            },
            { $inc: { attempts: 1 }, $set: { status: "pending" } },
            { sort: { createdAt: 1 }, new: true }
        );

        if (!claimed) break;

        result.attempted += 1;

        try {
            const { subject, html } = render(claimed.template, claimed.data || {});
            await getTransporter().sendMail({
                from: process.env.EMAIL_ADDRESS,
                to: claimed.to,
                subject,
                html,
            });

            claimed.status = "sent";
            claimed.sentAt = new Date();
            claimed.lastError = "";
            await claimed.save();

            result.sent += 1;
        } catch (error) {
            claimed.status = "failed";
            claimed.lastError = String(error?.message || error).slice(0, 300);
            // Back off before the next attempt, and give up after MAX_ATTEMPTS
            // so a permanently bad address does not loop forever.
            if (claimed.attempts < MAX_ATTEMPTS) {
                claimed.nextAttemptAt = new Date(Date.now() + 5 * 60 * 1000 * claimed.attempts);
            } else {
                claimed.nextAttemptAt = null;
            }
            await claimed.save();

            result.failed += 1;
            result.errors.push({ to: claimed.to, template: claimed.template, error: claimed.lastError });
        }
    }

    return result;
}
