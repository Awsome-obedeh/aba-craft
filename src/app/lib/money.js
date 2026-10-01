// Money helpers.
//
// Every amount in the escrow system is an INTEGER number of kobo (1 naira = 100
// kobo). Floats are never used for money: 0.1 + 0.2 !== 0.3 in binary floating
// point, and a ledger that does not reconcile is a ledger nobody trusts.
//
// The existing Order model still stores naira as a float for the catalogue and
// display layer. Conversion happens at the escrow boundary via nairaToKobo() /
// koboToNaira() so the two never silently mix.

/** Naira (may be a float, from the legacy Order model) -> integer kobo. */
export function nairaToKobo(naira) {
    return Math.round(Number(naira || 0) * 100);
}

/** Integer kobo -> naira, for display and for the legacy float fields. */
export function koboToNaira(kobo) {
    return Number(kobo || 0) / 100;
}

/** Format integer kobo for display, e.g. 123456 -> "1,234.56". */
export function formatKobo(kobo) {
    return koboToNaira(kobo).toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

/**
 * Apply a basis-point rate to a kobo amount, rounding DOWN.
 *
 * Rounding down is deliberate: the platform must never take a fraction of a
 * kobo it was not entitled to, and the remainder stays with the vendor. Using a
 * single rule everywhere means net + fee always reconciles exactly to gross.
 *
 * @param {number} amountKobo integer kobo
 * @param {number} rateBps    basis points, e.g. 1000 = 10%
 * @returns {number} integer kobo
 */
export function applyBps(amountKobo, rateBps) {
    const amount = toIntegerKobo(amountKobo);
    const rate = Number(rateBps || 0);
    if (!Number.isFinite(rate) || rate <= 0) return 0;
    return Math.floor((amount * rate) / 10000);
}

/** Coerce anything into a safe non-negative integer kobo value. */
export function toIntegerKobo(value) {
    const n = Math.round(Number(value || 0));
    return Number.isFinite(n) && n > 0 ? n : 0;
}

// --- Escrow configuration -------------------------------------------------

// Platform commission, in basis points. 1200 bps = 12%.
export const PLATFORM_FEE_BPS = Number(process.env.PLATFORM_FEE_BPS) || 1200;

// Customer-confirmation window. A vendor's auto-release deadline is set this
// far out from their delivery confirmation.
export const AUTO_RELEASE_DAYS = Number(process.env.AUTO_RELEASE_DAYS) || 7;

/**
 * Absolute floor on the auto-release window.
 *
 * Auto-release moves real money to a real bank account with no human in the
 * loop, so the window is the only thing standing between a slow courier and a
 * wrongful payout. We enforce a minimum regardless of configuration, so a
 * misconfigured AUTO_RELEASE_DAYS=1 cannot ship a 1-day window.
 */
export const MIN_AUTO_RELEASE_DAYS = 7;

/** The effective window, clamped to the floor above. */
export function effectiveAutoReleaseDays() {
    return Math.max(MIN_AUTO_RELEASE_DAYS, AUTO_RELEASE_DAYS);
}

/**
 * Split a gross kobo amount into platform fee and vendor net.
 * Uses the single rounding rule in applyBps, so fee + net === gross always.
 */
export function splitGross(grossKobo, feeBps = PLATFORM_FEE_BPS) {
    const gross = toIntegerKobo(grossKobo);
    const platformFee = applyBps(gross, feeBps);
    return { gross, platformFee, net: gross - platformFee };
}
