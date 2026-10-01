// Verifies the money invariants that the escrow flow depends on.
// Run: node scripts/verify-money.mjs
//
// These are pure functions, so they can be checked without a database or a
// running app. The properties asserted here are the ones that, if broken,
// silently corrupt real vendor payouts.

import assert from "node:assert/strict";

import {
    nairaToKobo,
    koboToNaira,
    applyBps,
    toIntegerKobo,
    splitGross,
    effectiveAutoReleaseDays,
    MIN_AUTO_RELEASE_DAYS,
} from "../src/app/lib/money.js";

let checks = 0;
const check = (name, fn) => {
    fn();
    checks += 1;
    console.log(`  ok  ${name}`);
};

console.log("\nmoney invariants\n");

// --- Conversion ------------------------------------------------------------
check("naira -> kobo is exact for 2dp values", () => {
    assert.equal(nairaToKobo(1500), 150000);
    assert.equal(nairaToKobo(0.01), 1);
    assert.equal(nairaToKobo("2500.50"), 250050);
});

check("kobo -> naira round-trips", () => {
    for (const n of [0, 1, 99, 12345.67, 1_000_000]) {
        assert.equal(nairaToKobo(koboToNaira(nairaToKobo(n))), nairaToKobo(n));
    }
});

check("float naira does not drift into off-by-one kobo", () => {
    // 8.7 * 100 is 869.9999999999999 in binary floating point. The rounding
    // in nairaToKobo is what keeps this exact.
    assert.equal(nairaToKobo(8.7), 870);
    assert.equal(nairaToKobo(0.29), 29);
    assert.equal(nairaToKobo(1.15), 115);
});

// --- The core reconciliation invariant -------------------------------------
// This is the single most important property in the system: the platform fee
// plus the vendor net must always equal the gross, to the exact kobo. If it
// does not, a kobo is created or destroyed on every single order.
check("splitGross: fee + net === gross for every amount, 0..100000 kobo", () => {
    for (let gross = 0; gross <= 100_000; gross += 1) {
        const { platformFee, net } = splitGross(gross);
        assert.equal(
            platformFee + net,
            gross,
            `mismatch at gross=${gross}: fee=${platformFee} net=${net}`
        );
        assert.ok(Number.isInteger(platformFee), `non-integer fee at ${gross}`);
        assert.ok(Number.isInteger(net), `non-integer net at ${gross}`);
        assert.ok(platformFee >= 0 && net >= 0, `negative component at ${gross}`);
    }
});

check("splitGross holds across a range of fee rates", () => {
    for (const bps of [0, 1, 500, 1200, 2500, 3333, 9999]) {
        for (let gross = 0; gross <= 20_000; gross += 7) {
            const { platformFee, net } = splitGross(gross, bps);
            assert.equal(platformFee + net, gross, `bps=${bps} gross=${gross}`);
        }
    }
});

check("platform fee never exceeds gross", () => {
    for (let gross = 0; gross <= 50_000; gross += 1) {
        const { platformFee, net } = splitGross(gross);
        assert.ok(platformFee <= gross, `fee ${platformFee} > gross ${gross}`);
        assert.ok(net >= 0);
    }
});

check("fee rounds down, so the remainder stays with the vendor", () => {
    // 12% of 1 kobo is 0.12 kobo. Rounding up would take a fraction of a kobo
    // the platform was never entitled to.
    assert.equal(applyBps(1, 1200), 0);
    assert.equal(applyBps(10, 1200), 1); // 1.2 -> 1
    assert.equal(applyBps(100, 1200), 12); // exactly 12
    assert.equal(applyBps(83, 1200), 9); // 9.96 -> 9
});

check("splitGross on a realistic order", () => {
    // A ₦12,500 order at 12%.
    const gross = nairaToKobo(12500);
    const { platformFee, net } = splitGross(gross);
    assert.equal(gross, 1_250_000);
    assert.equal(platformFee, 150_000);
    assert.equal(net, 1_100_000);
    assert.equal(platformFee + net, gross);
});

// --- Coercion safety -------------------------------------------------------
check("toIntegerKobo rejects junk", () => {
    assert.equal(toIntegerKobo(null), 0);
    assert.equal(toIntegerKobo(undefined), 0);
    assert.equal(toIntegerKobo("abc"), 0);
    assert.equal(toIntegerKobo(-500), 0);
    assert.equal(toIntegerKobo(NaN), 0);
    assert.equal(toIntegerKobo(Infinity), 0);
    assert.equal(toIntegerKobo(1500.4), 1500);
    assert.equal(toIntegerKobo(1500.6), 1501);
});

check("toIntegerKobo never returns a non-integer", () => {
    for (const v of [0, 1.5, 2.5, 1e15, "300.7", -1, NaN, Infinity]) {
        assert.ok(Number.isInteger(toIntegerKobo(v)), `non-integer from ${v}`);
    }
});

// --- Safety floor on auto-release ------------------------------------------
// Auto-release moves money with no human in the loop. A misconfigured env var
// must not be able to shrink the window to something unsafe.
check("auto-release window cannot drop below the floor", () => {
    assert.ok(effectiveAutoReleaseDays() >= MIN_AUTO_RELEASE_DAYS);
    assert.equal(MIN_AUTO_RELEASE_DAYS, 7);
});

console.log(`\n${checks} checks passed\n`);
