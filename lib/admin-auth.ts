import "server-only";
import { NextRequest } from "next/server";

/**
 * Verify admin authorization for cron/admin endpoints.
 * Accepts either:
 *   - Authorization: Bearer <ADMIN_CRON_SECRET> (manual calls)
 *   - Authorization: Bearer <CRON_SECRET> (Vercel cron jobs)
 */
export function requireAdmin(request: NextRequest): boolean {
    const auth = request.headers.get("authorization") || "";

    // Check ADMIN_CRON_SECRET (legacy/manual)
    const adminSecret = process.env.ADMIN_CRON_SECRET;
    if (adminSecret && auth === `Bearer ${adminSecret}`) {
        return true;
    }

    // Check CRON_SECRET (Vercel cron jobs)
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && auth === `Bearer ${cronSecret}`) {
        return true;
    }

    if (!adminSecret && !cronSecret) {
        console.error("Missing ADMIN_CRON_SECRET or CRON_SECRET environment variable");
    }

    return false;
}

