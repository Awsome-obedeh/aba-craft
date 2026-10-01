import connectDB from "@/app/lib/connect";

// Run `fn` inside a MongoDB transaction when the deployment supports one.
//
// Transactions require a replica set or mongos. A standalone MongoDB — which
// is exactly what a local dev machine usually runs — does NOT support them, and
// asking for one throws. So we probe once, cache the answer, and fall back to
// running `fn` without a session.
//
// Correctness does not depend on transactions being available: the ledger's
// unique `idempotencyKey` and the atomic findOneAndUpdate filters in
// escrow.js are what actually prevent double-posting and double-release. The
// transaction is defence in depth for multi-document writes.
let supportsTransactions = null; // null = not yet probed

async function probeTransactionSupport() {
    if (supportsTransactions !== null) return supportsTransactions;
    try {
        await connectDB();
        const mongoose = (await import("mongoose")).default;
        const session = await mongoose.startSession();
        try {
            // A session that can run a no-op command proves support.
            await session.withTransaction(async () => {});
            supportsTransactions = true;
        } finally {
            await session.endSession();
        }
    } catch {
        supportsTransactions = false;
    }
    return supportsTransactions;
}

/**
 * Run `fn(session)` with a transaction where possible.
 *
 * @param {(session: import('mongoose').ClientSession|null) => Promise<any>} fn
 * @returns {Promise<any>} whatever `fn` returns
 */
export async function withTransaction(fn) {
    if (await probeTransactionSupport()) {
        const mongoose = (await import("mongoose")).default;
        const session = await mongoose.startSession();
        try {
            let result;
            await session.withTransaction(async () => {
                result = await fn(session);
            });
            return result;
        } finally {
            await session.endSession();
        }
    }

    // Standalone MongoDB: no transaction. The caller's operations are still
    // individually atomic (findOneAndUpdate, unique indexes) so this is safe,
    // just not multi-document-atomic.
    return fn(null);
}

/** Exposed for tests and the reconcile job's diagnostics. */
export function transactionSupportKnown() {
    return supportsTransactions;
}
