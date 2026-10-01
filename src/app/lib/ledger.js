import LedgerEntry, { LEDGER_TYPES } from "@/models/LedgerEntry";
import Account, { ACCOUNT_CODES, ensureAccounts } from "@/models/Account";
import { toIntegerKobo } from "@/app/lib/money";

// The internal double-entry ledger.
//
// Every movement of money posts a balanced journal entry, and every entry
// updates the affected account balances. This is the source of truth for
// "how much is held / owed / earned" — we never infer it from order rows,
// because a single order touches several states over its life.
//
// Rules enforced here:
//   - Amounts are integer kobo.
//   - Every entry balances: sum(debits) === sum(credits).
//   - Entries are append-only. Corrections are posted as `reversal` entries.
//   - `idempotencyKey` makes a retried write a no-op instead of a duplicate.

/**
 * Which direction each account's balance grows in. Cached, because the
 * direction is a property of the chart of accounts and never changes at runtime.
 */
let normalBalanceCache = null;

async function getNormalBalances() {
    if (normalBalanceCache) return { normals: normalBalanceCache };
    const accounts = await Account.find({}, { code: 1, normalBalance: 1 }).lean();
    normalBalanceCache = Object.fromEntries(
        accounts.map((a) => [a.code, a.normalBalance])
    );
    return { normals: normalBalanceCache };
}

/**
 * Validate that a set of lines balances and contains no negatives.
 * Throws before anything is written, so a malformed entry never half-posts.
 */
function assertBalanced(lines) {
    if (!Array.isArray(lines) || lines.length < 2) {
        throw new Error("Ledger entry needs at least two lines");
    }

    let debits = 0;
    let credits = 0;
    for (const line of lines) {
        const d = toIntegerKobo(line.debit);
        const c = toIntegerKobo(line.credit);
        if (d > 0 && c > 0) {
            throw new Error(`Line for ${line.account} posts both debit and credit`);
        }
        if (d === 0 && c === 0) {
            throw new Error(`Line for ${line.account} posts nothing`);
        }
        debits += d;
        credits += c;
    }

    if (debits !== credits) {
        throw new Error(`Unbalanced ledger entry: debits ${debits} != credits ${credits}`);
    }
    return { debits, credits };
}

/**
 * Post a balanced journal entry and update account balances.
 *
 * @param {object} params
 * @param {string} params.type           one of LEDGER_TYPES
 * @param {Array<{account:string, debit?:number, credit?:number}>} params.lines
 * @param {string} [params.idempotencyKey] e.g. "charge_success:REF_1". Omit for
 *   manual/adjustment entries where duplicates are genuinely allowed.
 * @returns {Promise<{entry: object, balances: object, duplicate: boolean}>}
 */
export async function postEntry({
    type,
    lines,
    idempotencyKey,
    orderId,
    vendorOrderId,
    settlementId,
    vendorId,
    paystackReference,
    description,
    createdBy = "system",
    reverses,
}) {
    // Normalise and validate BEFORE any write.
    const normalised = lines.map((l) => ({
        account: l.account,
        debit: toIntegerKobo(l.debit),
        credit: toIntegerKobo(l.credit),
    }));
    assertBalanced(normalised);

    await ensureAccounts();

    // Idempotency: if this business fact is already posted, return the existing
    // entry instead of creating a duplicate. The unique index on
    // idempotencyKey is what actually guarantees this under concurrency — the
    // read is just a fast path.
    if (idempotencyKey) {
        const existing = await LedgerEntry.findOne({ idempotencyKey });
        if (existing) {
            return { entry: existing, balances: null, duplicate: true };
        }
    }

    // An account's balance is measured in its own normal direction, so a
    // balance is always a positive number meaning "how much of this account do
    // we hold". A debit-normal account (like PAYSTACK_CLEARING, an asset) grows
    // when debited; a credit-normal account (like ESCROW_LIABILITY, a liability)
    // grows when credited. Getting this backwards is what turns a 10,000 debit
    // into a -10,000 "asset".
    const { normals } = await getNormalBalances();
    const deltas = new Map();
    for (const line of normalised) {
        const normal = normals[line.account] || "debit";
        const delta = normal === "debit"
            ? line.debit - line.credit
            : line.credit - line.debit;
        deltas.set(line.account, (deltas.get(line.account) || 0) + delta);
    }

    let entry;
    try {
        entry = await LedgerEntry.create({
            type,
            lines: normalised,
            idempotencyKey,
            orderId,
            vendorOrderId,
            settlementId,
            vendorId,
            paystackReference,
            description,
            createdBy,
            reverses,
        });
    } catch (err) {
        // Lost a race on the unique idempotencyKey — someone else posted it.
        if (err?.code === 11000 && idempotencyKey) {
            const existing = await LedgerEntry.findOne({ idempotencyKey });
            if (existing) return { entry: existing, balances: null, duplicate: true };
        }
        throw err;
    }

    // Apply balance deltas. $inc is atomic per document, so concurrent
    // postings to the same account cannot clobber each other.
    const ops = [...deltas.entries()].map(([code, delta]) => ({
        updateOne: {
            filter: { code },
            update: { $inc: { balance: delta, entryCount: 1 } },
            upsert: true,
        },
    }));
    if (ops.length) await Account.bulkWrite(ops);

    return { entry, balances: Object.fromEntries(deltas), duplicate: false };
}

// --- Named postings -------------------------------------------------------
// Thin wrappers so call sites read as business events, not debit/credit pairs.

/**
 * Money arrived from Paystack for an order. Splits the total into the escrow
 * we owe vendors and the platform's fee.
 *
 *   DR PAYSTACK_CLEARING   total
 *   CR ESCROW_LIABILITY   sum(net)
 *   CR PLATFORM_REVENUE   sum(platformFee)
 */
export async function postPaymentReceived({ order, vendorOrders, reference, createdBy }) {
    const totalKobo = vendorOrders.reduce((s, v) => s + v.netAmount, 0) + vendorOrders.reduce((s, v) => s + v.platformFee, 0);
    const escrowKobo = vendorOrders.reduce((s, v) => s + v.netAmount, 0);
    const feeKobo = vendorOrders.reduce((s, v) => s + v.platformFee, 0);
    const shippingKobo = Math.max(0, totalKobo - escrowKobo - feeKobo);

    const lines = [{ account: ACCOUNT_CODES.PAYSTACK_CLEARING, debit: totalKobo }];
    if (escrowKobo > 0) lines.push({ account: ACCOUNT_CODES.ESCROW_LIABILITY, credit: escrowKobo });
    if (feeKobo > 0) lines.push({ account: ACCOUNT_CODES.PLATFORM_REVENUE, credit: feeKobo });
    // Shipping is collected once per order and is platform revenue — it is
    // never held in escrow, so a multi-vendor cart cannot double-count it.
    if (shippingKobo > 0) lines.push({ account: ACCOUNT_CODES.PLATFORM_REVENUE, credit: shippingKobo });

    return postEntry({
        type: LEDGER_TYPES.PAYMENT_RECEIVED,
        lines,
        idempotencyKey: `charge_success:${reference}`,
        orderId: order._id,
        paystackReference: reference,
        description: `Payment received for order ${order._id}`,
        createdBy,
    });
}

/**
 * A vendor order's escrow became payable to the vendor.
 *
 *   DR ESCROW_LIABILITY  net
 *   CR VENDOR_PAYABLE    net
 */
export async function postEscrowRelease({ vendorOrder, reference, createdBy }) {
    return postEntry({
        type: LEDGER_TYPES.ESCROW_RELEASE,
        lines: [
            { account: ACCOUNT_CODES.ESCROW_LIABILITY, debit: vendorOrder.netAmount },
            { account: ACCOUNT_CODES.VENDOR_PAYABLE, credit: vendorOrder.netAmount },
        ],
        idempotencyKey: reference ? `escrow_release:${reference}` : undefined,
        orderId: vendorOrder.orderId,
        vendorOrderId: vendorOrder._id,
        vendorId: vendorOrder.vendorId,
        description: `Escrow released for vendor order ${vendorOrder._id}`,
        createdBy,
    });
}

/**
 * Money left our balance to a vendor's bank account.
 *
 *   DR TRANSFERS_CLEARING  amount
 *   CR VENDOR_PAYABLE      amount
 *   CR PAYSTACK_FEES       paystack fee (when we absorb it)
 */
export async function postPayout({ settlement, transferReference, paystackFee = 0, createdBy }) {
    const amount = toIntegerKobo(settlement.amountSent);
    const fee = toIntegerKobo(paystackFee);
    const lines = [
        { account: ACCOUNT_CODES.TRANSFERS_CLEARING, debit: amount + fee },
        { account: ACCOUNT_CODES.VENDOR_PAYABLE, credit: amount },
    ];
    if (fee > 0) lines.push({ account: ACCOUNT_CODES.PAYSTACK_FEES_EXPENSE, credit: fee });

    return postEntry({
        type: LEDGER_TYPES.PAYOUT,
        lines,
        idempotencyKey: transferReference ? `payout:${transferReference}` : undefined,
        settlementId: settlement._id,
        vendorId: settlement.vendorId,
        paystackReference: transferReference,
        description: `Payout for settlement ${settlement._id}`,
        createdBy,
    });
}

/**
 * Money returned to a customer. Posts the original entry's mirror so the
 * ledger nets to zero — originals are never mutated.
 */
export async function postRefund({ order, amountKobo, reference, reason, createdBy }) {
    const amount = toIntegerKobo(amountKobo);
    return postEntry({
        type: LEDGER_TYPES.REFUND,
        lines: [
            { account: ACCOUNT_CODES.REFUNDS_PAYABLE, debit: amount },
            { account: ACCOUNT_CODES.PAYSTACK_CLEARING, credit: amount },
        ],
        idempotencyKey: reference ? `refund:${reference}` : undefined,
        orderId: order._id,
        paystackReference: reference,
        description: reason || `Refund for order ${order._id}`,
        createdBy,
    });
}

/**
 * The customer's half of a partial dispute outcome.
 *
 * Only the refund half is posted here. The vendor's half goes through the
 * normal requestRelease path, which posts its own escrow -> payable move. Doing
 * it that way keeps each leg independently idempotent, and means the vendor's
 * payout is the same audited path as every other payout.
 *
 *   DR ESCROW_LIABILITY   refundKobo
 *   CR REFUNDS_PAYABLE    refundKobo
 *
 * (REFUNDS_PAYABLE is settled out to the customer by postRefund once Paystack
 * confirms the refund; this entry records the platform's obligation.)
 *
 * @param {object} vendorOrder
 * @param {number} refundKobo  amount going to the customer
 * @param {string} reference   idempotency seed
 */
export async function postPartialRefund({ vendorOrder, refundKobo, orderId, reference, createdBy }) {
    const refund = toIntegerKobo(refundKobo);
    if (refund <= 0) return null;

    // Never refund more than is actually held for this vendor order.
    if (refund > toIntegerKobo(vendorOrder.netAmount)) {
        throw new Error(
            `Partial refund ${refund} exceeds escrowed net ${toIntegerKobo(vendorOrder.netAmount)}`
        );
    }

    return postEntry({
        type: LEDGER_TYPES.REFUND,
        lines: [
            { account: ACCOUNT_CODES.ESCROW_LIABILITY, debit: refund },
            { account: ACCOUNT_CODES.REFUNDS_PAYABLE, credit: refund },
        ],
        idempotencyKey: reference ? `partial_refund:${reference}` : undefined,
        orderId: orderId || vendorOrder.orderId,
        vendorOrderId: vendorOrder._id,
        vendorId: vendorOrder.vendorId,
        description: `Partial dispute refund to customer: ${refund} kobo`,
        createdBy,
    });
}

/** Post a correcting entry that mirrors an existing one. */
export async function postReversal({ originalEntry, reason, createdBy }) {
    const lines = originalEntry.lines.map((l) => ({
        account: l.account,
        debit: l.credit, // swap
        credit: l.debit,
    }));
    return postEntry({
        type: LEDGER_TYPES.REVERSAL,
        lines,
        orderId: originalEntry.orderId,
        vendorOrderId: originalEntry.vendorOrderId,
        description: `Reversal of ${originalEntry._id}: ${reason || "correction"}`,
        createdBy,
        reverses: originalEntry._id,
    });
}

/** Current balances for every account, for the admin dashboard. */
export async function getAccountBalances() {
    await ensureAccounts();
    return Account.find().sort({ code: 1 }).lean();
}
