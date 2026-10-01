// Shared guard for the cron job routes.
//
// Vercel Cron, GitHub Actions and manual curl all need a way to reach these
// endpoints without exposing them to the public internet. They all send the
// same bearer token in the Authorization header.
//
// If CRON_SECRET is not configured, the jobs refuse to run rather than running
// open. Auto-release moves real money, so failing closed is the right default.

export function assertCronAuthorized(req) {
    const secret = process.env.CRON_SECRET;

    if (!secret) {
        return {
            ok: false,
            status: 503,
            message: "CRON_SECRET is not set; scheduled jobs are disabled",
        };
    }

    const header = req.headers.get("authorization");
    if (header !== `Bearer ${secret}`) {
        return { ok: false, status: 401, message: "Unauthorized" };
    }

    return { ok: true };
}
