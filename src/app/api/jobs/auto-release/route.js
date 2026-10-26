// GET/POST /api/jobs/auto-release
//
// Releases escrow for vendor orders whose customer-confirmation window has
// elapsed without the customer responding and with no open dispute.
//
// This job moves real money to real bank accounts with no human in the loop, so
// the safeguards are deliberate:
//   - MIN_AUTO_RELEASE_DAYS in money.js clamps the window to an absolute floor,
//     so a misconfigured AUTO_RELEASE_DAYS cannot ship a 1-day window.
//   - Open disputes are excluded inside the atomic filter, so a dispute raised
//     moments before the deadline still wins the race.
//   - requestRelease is a single atomic findOneAndUpdate, so running this from
//     several instances at once cannot double-release an order.
//
// Releasing does not pay out — it marks the order release_pending. The
// settlement job then batches it into a Paystack transfer.

import connectDB from "@/app/lib/connect";
import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/app/lib/cronAuth";
import { runAutoRelease } from "@/app/lib/escrow";
import { effectiveAutoReleaseDays, MIN_AUTO_RELEASE_DAYS } from "@/app/lib/money";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handler(req) {
    const auth = assertCronAuthorized(req);
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
    }

    try {
        await connectDB();
        const result = await runAutoRelease({ limit: 200 });

        return NextResponse.json({
            success: true,
            message: `Scanned ${result.scanned}, released ${result.released} for settlement`,
            autoReleaseWindowDays: effectiveAutoReleaseDays(),
            minWindowDays: MIN_AUTO_RELEASE_DAYS,
            releasedOrderIds: result.orders.map((o) => String(o._id)),
        });
    } catch (error) {
        console.error("AUTO-RELEASE JOB ERROR:", error);
        // 5xx so the scheduler retries rather than silently skipping a window.
        return NextResponse.json(
            { success: false, message: "Auto-release job failed" },
            { status: 500 }
        );
    }
}

export const GET = handler;
export const POST = handler;
