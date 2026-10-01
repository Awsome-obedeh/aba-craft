// GET/POST /api/jobs/process-settlements
//
// Batches every `release_pending` vendor order into a per-vendor settlement and
// sends the Paystack transfer, then retries settlements that previously failed.
//
// Run this after auto-release, and on its own schedule for retries. Both steps
// are safe to run concurrently from multiple instances: processSettlement claims
// a settlement with an atomic status update, and the ledger's idempotency key
// stops the payment posting twice.

import connectDB from "@/app/lib/connect";
import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/app/lib/cronAuth";
import { runSettlementProcessing } from "@/app/lib/settlement";
import { MAX_ATTEMPTS } from "@/app/lib/settlement";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function handler(req) {
    const auth = assertCronAuthorized(req);
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
    }

    try {
        await connectDB();
        const result = await runSettlementProcessing({ limit: 50 });

        return NextResponse.json({
            success: true,
            message: `${result.batches} batch(es), ${result.paid} paid, ${result.failed} failed, ${result.retried} retried`,
            maxAttempts: MAX_ATTEMPTS,
            details: result.details,
        });
    } catch (error) {
        console.error("PROCESS-SETTLEMENTS JOB ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Settlement processing failed" },
            { status: 500 }
        );
    }
}

export const GET = handler;
export const POST = handler;
