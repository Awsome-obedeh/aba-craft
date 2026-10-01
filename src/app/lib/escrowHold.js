import VendorOrder, { ESCROW } from "@/models/VendorOrder";
import User from "@/models/User";
import Order from "@/models/Order";
import { postPaymentReceived } from "@/app/lib/ledger";
import { enqueueNotification } from "@/app/lib/notifications";
import { effectiveAutoReleaseDays, koboToNaira } from "@/app/lib/money";

// Marks a paid order's escrow as held and posts the ledger entry that splits
// the payment into vendor escrow and platform revenue.
//
// This lives in one place because it must behave identically whether it is
// triggered by the charge.success webhook (the trusted path) or by the
// browser-facing /payments/verify fallback. Both call this, and the ledger's
// unique idempotencyKey means whichever runs second is a no-op.
export async function holdEscrowForOrder(order, reference, { createdBy = "system" } = {}) {
    if (!order) return null;

    let vendorOrders = await VendorOrder.find({ orderId: order._id }).lean();

    // A webhook can beat the order-creation write, leaving no vendor orders to
    // hold. Build them on demand from the order's own items.
    if (vendorOrders.length === 0) {
        const { createVendorOrdersForOrder } = await import("@/app/lib/vendorSplit");
        const created = await createVendorOrdersForOrder(order, order.items);
        vendorOrders = created.map((v) => v.toObject());
    }

    // Post the payment split. Idempotent on `charge_success:<reference>`.
    await postPaymentReceived({
        order,
        vendorOrders,
        reference,
        createdBy,
    });

    // Flip none -> held. updateMany is safe against a concurrent second run.
    await VendorOrder.updateMany(
        { orderId: order._id, escrowStatus: ESCROW.NONE },
        {
            $set: { escrowStatus: ESCROW.HELD },
            $push: { statusLog: { at: new Date(), event: "escrow_held", by: createdBy } },
        }
    );

    // Tell each vendor their order is paid and waiting to be delivered.
    // Notification 1 of 4. Deduped per vendor order so a retried webhook does
    // not send it twice.
    const autoReleaseDays = effectiveAutoReleaseDays();
    for (const vo of vendorOrders) {
        const vendor = await User.findById(vo.vendorId).select("email fullName").lean();
        if (!vendor?.email) continue;

        await enqueueNotification({
            to: vendor.email,
            role: "vendor",
            template: "order_paid_to_vendor",
            vendorOrderId: vo._id,
            orderId: order._id,
            dedupeKey: `order_paid_to_vendor:${vo._id}`,
            data: {
                orderId: String(order._id),
                netAmount: vo.netAmount,
                grossAmount: vo.grossAmount,
                autoReleaseDays,
            },
        });
    }

    return vendorOrders;
}
