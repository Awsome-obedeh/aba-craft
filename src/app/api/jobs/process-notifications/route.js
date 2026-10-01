// GET/POST /api/jobs/process-notifications
//
// Drains the notification outbox and sends the auto-release warnings.
//
// Emails are queued by the escrow transitions and sent here, out of band, so a
// flaky SMTP server can never roll back or block a successful payment. Failed
// sends are retried with backoff by processOutbox().

import connectDB from "@/app/lib/connect";
import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/app/lib/cronAuth";
import { processOutbox } from "@/app/lib/notifications";
import { sendAutoReleaseWarnings } from "@/app/lib/escrow";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function handler(req) {
    const auth = assertCronAuthorized(req);
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
    }

    try {
        await connectDB();

        // Warn customers whose payment is about to release without their say.
        const warnings = await sendAutoReleaseWarnings({ daysBefore: 2, limit: 100 });

        // Then flush anything queued.
        const outbox = await processOutbox({ limit: 25 });

        return NextResponse.json({
            success: true,
            message: `Queued ${warnings.queued} release warning(s), sent ${outbox.sent}/${outbox.attempted}`,
            warnings,
            outbox,
        });
    } catch (error) {
        console.error("PROCESS-NOTIFICATIONS JOB ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Notification processing failed" },
            { status: 500 }
        );
    }
}

export const GET = handler;
export const POST = handler;
