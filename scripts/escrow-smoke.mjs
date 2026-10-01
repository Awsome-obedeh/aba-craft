// Smoke test for the escrow money path.
//
//   node scripts/escrow-smoke.mjs
//
// Verifies the things that would silently corrupt real money if wrong:
//   - gross splits into fee + net with no kobo lost
//   - every ledger entry balances
//   - the global debit/credit invariant holds
//   - account balances match a fresh aggregation of the entries
//   - the release gate only fires when both confirmations exist
//   - idempotency keys prevent a double-post
//
// Uses a throwaway database so it never touches dev data.

import "dotenv/config";
import mongoose from "mongoose";
import {
    splitGross,
    applyBps,
    nairaToKobo,
    effectiveAutoReleaseDays,
    MIN_AUTO_RELEASE_DAYS,
} from "../src/app/lib/money.js";
import { postEntry, postPaymentReceived, getAccountBalances, postPartialRefund, postEscrowRelease } from "../src/app/lib/ledger.js";
import LedgerEntry from "../src/models/LedgerEntry.js";
import Account, { ensureAccounts } from "../src/models/Account.js";
import { isReleasable } from "../src/app/lib/escrow.js";
import { ESCROW } from "../src/models/VendorOrder.js";

const SMOKE_DB = "abacraft_escrow_smoke";

let passed = 0;
let failed = 0;

function check(label, condition, detail = "") {
    if (condition) {
        passed += 1;
        console.log(`  PASS  ${label}`);
    } else {
        failed += 1;
        console.log(`  FAIL  ${label} ${detail}`);
    }
}

/** True when total debits equal total credits across the whole ledger. */
async function ledgerBalances() {
    const totals = await LedgerEntry.aggregate([
        { $unwind: "$lines" },
        { $group: { _id: null, debits: { $sum: "$lines.debit" }, credits: { $sum: "$lines.credit" } } },
    ]);
    return (totals[0]?.debits || 0) === (totals[0]?.credits || 0);
}

async function main() {
    // Connect to a scratch database.
    const base = (process.env.MONGODB_URI || "mongodb://localhost:27017/Aba-craft").split("/").slice(0, -1).join("/");
    await mongoose.connect(`${base}/${SMOKE_DB}`);
    console.log(`Connected to scratch database: ${SMOKE_DB}\n`);

    // Wipe it so the test is repeatable.
    await mongoose.connection.dropDatabase();

    console.log("Money arithmetic");
    {
        // No kobo may be lost or invented.
        const cases = [0, 1, 99, 100, 1234, 999_999, 12_345_678];
        let allReconcile = true;
        for (const gross of cases) {
            const { platformFee, net } = splitGross(gross, 1200);
            if (platformFee + net !== gross) allReconcile = false;
        }
        check("platformFee + net === gross for all amounts", allReconcile);

        // Rounding must be deterministic and down, never up.
        check("applyBps rounds down", applyBps(101, 1000) === 10, `got ${applyBps(101, 1000)}`);
        check("applyBps of zero is zero", applyBps(0, 1200) === 0);
        check("nairaToKobo rounds to integer", nairaToKobo(1234.56) === 123456);

        // Splitting 10,000 kobo at 12% -> 1,200 fee, 8,800 net.
        const s = splitGross(10_000, 1200);
        check("12% of 10000 is 1200", s.platformFee === 1200, `got ${s.platformFee}`);
        check("net of 10000 at 12% is 8800", s.net === 8800, `got ${s.net}`);

        check("auto-release window respects the floor", effectiveAutoReleaseDays() >= MIN_AUTO_RELEASE_DAYS);
    }

    console.log("\nLedger integrity");
    {
        await ensureAccounts();

        // A deliberately unbalanced entry must be rejected before writing.
        let threw = false;
        try {
            await postEntry({
                type: "payment_received",
                lines: [
                    { account: "PAYSTACK_CLEARING", debit: 1000 },
                    { account: "ESCROW_LIABILITY", credit: 900 },
                ],
                description: "should not post",
            });
        } catch {
            threw = true;
        }
        check("unbalanced entry is rejected", threw);
        check("rejected entry wrote nothing", (await LedgerEntry.countDocuments()) === 0);

        // A balanced entry posts and updates balances.
        await postEntry({
            type: "payment_received",
            lines: [
                { account: "PAYSTACK_CLEARING", debit: 10_000 },
                { account: "ESCROW_LIABILITY", credit: 8_800 },
                { account: "PLATFORM_REVENUE", credit: 1_200 },
            ],
            idempotencyKey: "charge_success:SMOKE_1",
            description: "smoke test payment",
        });

        check("balanced entry is written", (await LedgerEntry.countDocuments()) === 1);

        const clearing = await Account.findOne({ code: "PAYSTACK_CLEARING" }).lean();
        const escrow = await Account.findOne({ code: "ESCROW_LIABILITY" }).lean();
        const revenue = await Account.findOne({ code: "PLATFORM_REVENUE" }).lean();

        check("clearing debited 10000", clearing?.balance === 10_000, `got ${clearing?.balance}`);
        check("escrow credited 8800", escrow?.balance === 8_800, `got ${escrow?.balance}`);
        check("revenue credited 1200", revenue?.balance === 1_200, `got ${revenue?.balance}`);
    }

    console.log("\nIdempotency");
    {
        const before = await LedgerEntry.countDocuments();

        // Replay the same business fact, as a retried webhook would.
        const replay = await postEntry({
            type: "payment_received",
            lines: [
                { account: "PAYSTACK_CLEARING", debit: 10_000 },
                { account: "ESCROW_LIABILITY", credit: 8_800 },
                { account: "PLATFORM_REVENUE", credit: 1_200 },
            ],
            idempotencyKey: "charge_success:SMOKE_1",
        });

        const after = await LedgerEntry.countDocuments();
        check("replay reports duplicate", replay.duplicate === true);
        check("replay did not add an entry", before === after, `${before} -> ${after}`);

        const clearing = await Account.findOne({ code: "PAYSTACK_CLEARING" }).lean();
        check("replay did not double-count", clearing?.balance === 10_000, `got ${clearing?.balance}`);
    }

    console.log("\nGlobal invariants");
    {
        // Across every entry, debits must equal credits.
        const totals = await LedgerEntry.aggregate([
            { $unwind: "$lines" },
            { $group: { _id: null, debits: { $sum: "$lines.debit" }, credits: { $sum: "$lines.credit" } } },
        ]);
        check(
            "total debits equal total credits",
            totals[0].debits === totals[0].credits,
            `${totals[0].debits} vs ${totals[0].credits}`
        );

        // Materialised balances must match a fresh aggregation, measured in each
        // account's own normal direction.
        const lines = await LedgerEntry.aggregate([
            { $unwind: "$lines" },
            {
                $group: {
                    _id: "$lines.account",
                    debits: { $sum: "$lines.debit" },
                    credits: { $sum: "$lines.credit" },
                },
            },
        ]);
        const accounts = await getAccountBalances();
        const lineMap = new Map(lines.map((l) => [l._id, l]));

        const allMatch = accounts.every((a) => {
            const l = lineMap.get(a.code);
            if (!l) return a.balance === 0;
            const expected = a.normalBalance === "debit" ? l.debits - l.credits : l.credits - l.debits;
            return a.balance === expected;
        });
        check("every account balance matches recomputed", allMatch);

        const clearing = accounts.find((a) => a.code === "PAYSTACK_CLEARING");
        check("clearing is positive after a debit", clearing?.balance > 0, `got ${clearing?.balance}`);
    }

    console.log("\nRelease gate");
    {
        const base = { escrowStatus: ESCROW.HELD, disputeStatus: "none" };
        const past = new Date(Date.now() - 1000);
        const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

        check(
            "neither confirmation -> not releasable",
            isReleasable({ ...base, vendorConfirmedDeliveryAt: null, customerConfirmedReceiptAt: null }) === false
        );
        check(
            "only vendor confirmed -> not releasable",
            isReleasable({ ...base, vendorConfirmedDeliveryAt: new Date(), customerConfirmedReceiptAt: null }) === false
        );
        check(
            "only customer confirmed -> not releasable",
            isReleasable({ ...base, vendorConfirmedDeliveryAt: null, customerConfirmedReceiptAt: new Date() }) === false
        );
        check(
            "both confirmed -> releasable",
            isReleasable({ ...base, vendorConfirmedDeliveryAt: new Date(), customerConfirmedReceiptAt: new Date() }) === true
        );
        check(
            "open dispute blocks release even when both confirmed",
            isReleasable({
                ...base,
                disputeStatus: "open",
                vendorConfirmedDeliveryAt: new Date(),
                customerConfirmedReceiptAt: new Date(),
            }) === false
        );
        check(
            "auto-release window elapsed -> releasable",
            isReleasable({ ...base, vendorConfirmedDeliveryAt: new Date(), autoReleaseAt: past }) === true
        );
        check(
            "auto-release window in future -> not releasable",
            isReleasable({ ...base, vendorConfirmedDeliveryAt: new Date(), autoReleaseAt: future }) === false
        );
        check(
            "already released -> not releasable again",
            isReleasable({
                escrowStatus: ESCROW.RELEASE_PENDING,
                disputeStatus: "none",
                vendorConfirmedDeliveryAt: new Date(),
                customerConfirmedReceiptAt: new Date(),
            }) === false
        );
    }

    // --- Partial dispute split ---------------------------------------------
    // A partial resolution moves money two ways at once: part back to the
    // customer, part on to the vendor. The failure mode that matters is
    // double-crediting the vendor, so the test asserts the escrow account is
    // drained exactly once across the two entries.
    console.log("\nPartial dispute split");

    {
        const escrowNet = 10000; // vendor's share in kobo
        const refundKobo = 3000;
        const releaseKobo = 7000;

        const before = await getAccountBalances();
        const escrowBefore = before.find((a) => a.code === "ESCROW_LIABILITY")?.balance || 0;
        const payableBefore = before.find((a) => a.code === "VENDOR_PAYABLE")?.balance || 0;
        const refundsBefore = before.find((a) => a.code === "REFUNDS_PAYABLE")?.balance || 0;

        const fakeVendorOrder = {
            _id: new mongoose.Types.ObjectId(),
            orderId: new mongoose.Types.ObjectId(),
            vendorId: new mongoose.Types.ObjectId(),
            netAmount: escrowNet,
        };

        // The customer's half. Measured on its own, because ESCROW_LIABILITY is
        // legitimately debited by BOTH legs — the refund and the later release.
        await postPartialRefund({
            vendorOrder: fakeVendorOrder,
            refundKobo,
            orderId: fakeVendorOrder.orderId,
            reference: "partial_test_1",
            createdBy: "test",
        });

        const afterRefund = await getAccountBalances();
        const escrowAfterRefund =
            afterRefund.find((a) => a.code === "ESCROW_LIABILITY")?.balance || 0;
        const refundsAfterRefund =
            afterRefund.find((a) => a.code === "REFUNDS_PAYABLE")?.balance || 0;

        check(
            "refund leg debits escrow by exactly the refunded amount",
            escrowBefore - escrowAfterRefund === refundKobo,
            `moved ${escrowBefore - escrowAfterRefund}, expected ${refundKobo}`
        );
        check(
            "refund leg credits refunds payable by exactly the refunded amount",
            refundsAfterRefund - refundsBefore === refundKobo
        );

        // The vendor's half, through the normal release path.
        await postEscrowRelease({
            vendorOrder: { ...fakeVendorOrder, netAmount: releaseKobo },
            reference: "vo_partial_test_1",
            createdBy: "test",
        });

        const after = await getAccountBalances();
        const escrowAfter = after.find((a) => a.code === "ESCROW_LIABILITY")?.balance || 0;
        const payableAfter = after.find((a) => a.code === "VENDOR_PAYABLE")?.balance || 0;

        check(
            "release leg debits escrow by exactly the released amount",
            escrowAfterRefund - escrowAfter === releaseKobo,
            `moved ${escrowAfterRefund - escrowAfter}, expected ${releaseKobo}`
        );
        check(
            "vendor half credits payable by the released amount",
            payableAfter - payableBefore === releaseKobo,
            `credited ${payableAfter - payableBefore}, expected ${releaseKobo}`
        );
        check(
            "vendor payable is credited exactly once, not twice",
            payableAfter - payableBefore === releaseKobo && releaseKobo !== escrowNet,
            `credited ${payableAfter - payableBefore}`
        );
        check(
            "the two legs together drain the escrow exactly once",
            escrowBefore - escrowAfter === refundKobo + releaseKobo,
            `drained ${escrowBefore - escrowAfter}, expected ${escrowNet}`
        );

        // A refund larger than the escrow must be refused rather than
        // creating a negative or over-refunded position.
        let threw = false;
        try {
            await postPartialRefund({
                vendorOrder: fakeVendorOrder,
                refundKobo: escrowNet + 1,
                orderId: fakeVendorOrder.orderId,
                reference: "partial_test_over",
                createdBy: "test",
            });
        } catch {
            threw = true;
        }
        check("refund larger than escrow is rejected", threw);

        const final = await getAccountBalances();
        check(
            "the rejected refund changed nothing",
            (final.find((a) => a.code === "REFUNDS_PAYABLE")?.balance || 0) === refundsAfterRefund
        );
        check(
            "ledger still balances after the split",
            await ledgerBalances()
        );
    }

    // Clean up the scratch database.
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
    console.error("Smoke test crashed:", err);
    process.exit(1);
});
