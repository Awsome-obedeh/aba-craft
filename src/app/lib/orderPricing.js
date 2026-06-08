// src/app/lib/orderPricing.js
//
// Single source of truth for "what is the final unit price of a product?"
// Used by checkout to re-validate the cart against the live database.

export const SHIPPING_FEE_NGN = Number(process.env.SHIPPING_FEE_NGN) || 2000;

/**
 * Compute the per-unit final price a customer would actually pay for a
 * product, applying discount price OR discount percentage (whichever yields
 * the lower price).
 */
export const computeFinalUnitPrice = (product) => {
    const base = Number(product.price) || 0;
    const discountPrice = Number(product.discountPrice) || 0;
    const discountPercentage = Number(product.discountPercentage) || 0;

    const withFlat = discountPrice > 0 ? base - discountPrice : base;
    const withPct = discountPercentage > 0 ? base - (base * discountPercentage) / 100 : base;
    return Math.max(0, Math.min(withFlat, withPct));
};

export const computeTotals = (items) => {
    const subtotal = items.reduce((sum, i) => sum + i.finalUnitPrice * i.quantity, 0);
    return {
        subtotal,
        shippingFee: subtotal > 0 ? SHIPPING_FEE_NGN : 0,
        total: subtotal + (subtotal > 0 ? SHIPPING_FEE_NGN : 0),
    };
};
