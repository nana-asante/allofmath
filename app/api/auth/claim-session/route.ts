import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionHash } from "@/lib/session";

export const runtime = "nodejs";

/**
 * POST /api/auth/claim-session
 * Migrates anonymous session data (attempts, votes) to the authenticated user.
 * Call this immediately after sign-in.
 */
export async function POST() {
    // 1. Verify user is authenticated
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get anonymous session hash
    const sessionHash = await getSessionHash();
    if (!sessionHash) {
        // No anonymous session to claim, just return success
        return NextResponse.json({ claimed: false, reason: "no_session" });
    }

    // 3. Claim session using shared logic
    const { claimSession } = await import("@/lib/claim-session");
    const result = await claimSession(user.id, sessionHash, user.user_metadata);

    if (!result.success) {
        return NextResponse.json({ error: "Failed to claim session" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
