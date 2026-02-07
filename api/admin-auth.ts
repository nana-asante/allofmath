import "server-only";
import { NextRequest } from "next/server";

/**
 * Verify admin authorization for cron/admin endpoints.
 * Expects: Authorization: Bearer <ADMIN_CRON_SECRET>
 */
export function requireAdmin(request: NextRequest): boolean {
    const auth = request.headers.get("authorization") || "";
    const expected = process.env.ADMIN_CRON_SECRET;

    if (!expected) {
        console.error("Missing ADMIN_CRON_SECRET environment variable");
        return false;
    }

    return auth === `Bearer ${expected}`;
}
