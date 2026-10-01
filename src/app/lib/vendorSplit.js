import VendorOrder, { ESCROW, FULFILLMENT } from "@/models/VendorOrder";
import { splitGross, PLATFORM_FEE_BPS, toIntegerKobo } from "@/app/lib/money";
import { computeFinalUnitPrice } from "@/app/lib/orderPricing";
import { nairaToKobo } from "@/app/lib/money";

// Splits a multi-vendor order into per-vendor escrow slices.
//
// One customer Order can contain products from several vendors, but Paystack
// takes a single payment for the whole basket. VendorOrder is where we divide
// it: each slice holds its own money and its own delivery/escrow state, so one
// vendor shipping early never implies the whole order shipped.
//
// This module is pure (no database access) so it can be unit tested and reused
// by both order creation and the webhook's recovery path.

/** Group a flat item list by vendor id, preserving order. */
export function groupItemsByVendor(items) {
    const groups = new Map();
    for (const item of items) {
        const vendorId = String(item.vendor);
        if (!groups.has(vendorId)) groups.set(vendorId, []);
        groups.get(vendorId).push(item);
    }
    return groups;
}

/**
 * Work out each vendor's gross, platform fee, and net from an order.
 *
 * Shipping is charged once per order (not per vendor) and is treated as
 * platform revenue, so it never enters escrow. That keeps a multi-vendor cart
 * from double-counting the same shipping fee, and means the platform is not
 * silently keeping money it never explained.
 *
 * @param {Map<string, Array>} groups from groupItemsByVendor
 * @param {object} order
 * @returns {Array} one descriptor per vendor
 */
export function deriveVendorAmounts(groups, order) {
    const feeBps = Number(process.env.PLATFORM_FEE_BPS) || PLATFORM_FEE_BPS;
    const out = [];

    for (const [vendorId, items] of groups) {
        // Line items store naira floats on the legacy Order model. Convert once,
        // here, at the boundary — the escrow side is kobo throughout.
        const lineItems = items.map((item) => {
            const unitKobo = item.unitPriceKobo ?? nairaToKobo(item.unitPrice);
            return {
                product: item.product,
                productName: item.productName,
                productImage: item.productImage || "",
                unitPrice: unitKobo,
                quantity: item.quantity,
                lineTotal: unitKobo * item.quantity,
            };
        });

        const grossAmount = lineItems.reduce((s, l) => s + l.lineTotal, 0);
        const { platformFee, net } = splitGross(grossAmount, feeBps);

        out.push({
            vendorId,
            items: lineItems,
            grossAmount,
            platformFee,
            netAmount: net,
            platformFeeBps: feeBps,
        });
    }

    return out;
}

/**
 * Create the VendorOrder rows for a freshly placed order.
 *
 * @param {object} order      the saved Order document
 * @param {Array}  lineItems  hydrated line items, each with `vendor`
 * @param {object} [opts]
 * @param {string} [opts.escrowStatus] ESCROW.HELD when payment already captured
 * @returns {Promise<Array>} created VendorOrder documents
 */
export async function createVendorOrdersForOrder(order, lineItems, { escrowStatus = ESCROW.NONE } = {}) {
    const groups = groupItemsByVendor(lineItems);
    const derived = deriveVendorAmounts(groups, order);

    const created = [];
    for (const d of derived) {
        const vo = await VendorOrder.create({
            orderId: order._id,
            vendorId: d.vendorId,
            items: d.items,
            grossAmount: d.grossAmount,
            platformFee: d.platformFee,
            netAmount: d.netAmount,
            platformFeeBps: d.platformFeeBps,
            escrowStatus,
            fulfillmentStatus: FULFILLMENT.PENDING,
            statusLog: [
                {
                    at: new Date(),
                    event: "created",
                    by: "system:order-create",
                },
            ],
        });
        created.push(vo);
    }

    return created;
}

export { toIntegerKobo, computeFinalUnitPrice };
