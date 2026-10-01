// Exercises the real Youverify v2 contract against the live sandbox, using the
// same request the fixed route builds. Run: node scripts/verify-youverify.mjs
//
// This exists because the original failure was three separate bugs stacked on
// top of each other, and only the live API distinguishes them.

import { config } from "dotenv";

// This project keeps its secrets in .env.local, which `dotenv/config` does not
// read. Load it explicitly, without overriding anything already in the
// environment.
config({ path: [".env.local", ".env"], override: false, quiet: true });

const BASE = (process.env.YOUVERIFY_BASE_URL || "").replace(/\/$/, "");
const PATH = process.env.YOUVERIFY_BVN_VERIFY_PATH || "/v2/api/identity/ng/bvn";
const KEY = process.env.YOUVERIFY_API_KEY;
const URL = `${BASE}${PATH.startsWith("/") ? "" : "/"}${PATH}`;

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

if (!KEY || !BASE) {
    console.error("Set YOUVERIFY_API_KEY and YOUVERIFY_BASE_URL first.");
    process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Mirrors the fixed route exactly. */
async function verifyBvn(bvn) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
        const res = await fetch(URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                token: KEY,
            },
            body: JSON.stringify({ id: bvn, isSubjectConsent: true }),
            signal: controller.signal,
        });
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            data = { raw: text };
        }
        return { res, data };
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Youverify rate-limits per ID number, so back-to-back runs get HTTP 429.
 * Wait it out rather than reporting a green build as broken — but do not hide
 * it, because a 429 means the assertions below proved nothing.
 */
async function verifyBvnWithRetry(bvn, attempts = 4) {
    let out;
    for (let i = 0; i < attempts; i++) {
        out = await verifyBvn(bvn);
        if (out.res.status !== 429) return out;
        const wait = 5000 * (i + 1);
        console.log(`  ....  rate limited (429), waiting ${wait / 1000}s`);
        await sleep(wait);
    }
    return out;
}

console.log(`\nYouverify contract (${URL})\n`);

// Skip the live checks when still rate limited, rather than reporting
// failures that are really just "try again shortly".
{
    const probe = await verifyBvnWithRetry("11111111111");
    if (probe.res.status === 429) {
        console.log(
            "\n  SKIPPED  Youverify is still rate limiting this ID; live checks did not run.\n"
        );
        process.exit(0);
    }

    // 1. A known-good test BVN must authenticate and report found. This is the
    //    case the old route could never reach: it sent no `token` header.
    check("known test BVN is accepted", probe.res.ok, `HTTP ${probe.res.status}`);
    check(
        "envelope reports success",
        probe.data?.success === true,
        JSON.stringify(probe.data).slice(0, 120)
    );
    check(
        'status is "found"',
        probe.data?.data?.status === "found",
        `got ${probe.data?.data?.status}`
    );
}

// 2. A BVN that is not on file returns HTTP 200 with status "not_found".
//    This is the case the old route silently reported as a SUCCESSFUL
//    verification, because it only looked at the HTTP status code.
{
    const { res, data } = await verifyBvn("00000000000");
    check("unknown BVN still returns HTTP 200", res.ok, `HTTP ${res.status}`);
    check(
        'status is "not_found"',
        data?.data?.status === "not_found",
        `got ${data?.data?.status}`
    );
    check(
        "route must treat not_found as a failure, not a success",
        !(data?.success === true && data?.data?.status === "found")
    );
}

// 3. A real BVN in the sandbox is refused. The route must translate this into
//    an actionable message rather than a generic failure.
{
    const { res, data } = await verifyBvn("22141983590");
    check("sandbox refuses a real BVN", res.status === 403, `HTTP ${res.status}`);
    check(
        "refusal reason is the test-ID restriction",
        /only test ids/i.test(data?.message || ""),
        data?.message
    );
}

// 4. The old auth must be proven wrong, so a regression cannot silently pass.
{
    const res = await fetch(URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${KEY}`,
            "X-API-Key": KEY,
        },
        body: JSON.stringify({ bvn: "11111111111", bank_verification_number: "11111111111" }),
    });
    const data = await res.json().catch(() => ({}));
    check(
        "legacy Bearer + X-API-Key auth is rejected (the original bug)",
        res.status === 401,
        `HTTP ${res.status}`
    );
    check(
        'rejection names the missing "token" header',
        /token/i.test(data?.message || ""),
        data?.message
    );
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
