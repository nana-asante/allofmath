import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionHash } from "@/lib/session";

export const runtime = "nodejs";

/**
 * POST /api/auth/claim-session
 * Migrates anonymous session data (attempts, votes) to the authenticated user.
 * Call this immediately after sign-in.
 */
export async function POST(request: NextRequest) {
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

    try {
        // 3. Update attempts
        const { error: attemptsError } = await supabaseAdmin
            .from("attempts")
            .update({ user_id: user.id })
            .eq("session_hash", sessionHash)
            .is("user_id", null);

        if (attemptsError) {
            console.error("claim-session attempts error:", attemptsError);
            // Don't fail the whole request, try votes next
        }

        // 4. Update votes
        const { error: votesError } = await supabaseAdmin
            .from("pairwise_votes")
            .update({ user_id: user.id })
            .eq("session_hash", sessionHash)
            .is("user_id", null);

        if (votesError) {
            console.error("claim-session votes error:", votesError);
        }

        // 5. Initialize user stats (if not exists)
        await supabaseAdmin
            .from("user_ratings")
            .upsert(
                { user_id: user.id, rating: 1000, n_attempts: 0 },
                { onConflict: "user_id", ignoreDuplicates: true }
            );

        // 6. Init profile (if not exists) using GitHub/Google metadata if available
        const displayName =
            user.user_metadata.full_name ||
            user.user_metadata.name ||
            user.email?.split("@")[0] ||
            "Anonymous";

        await supabaseAdmin
            .from("profiles")
            .upsert(
                { user_id: user.id, display_name: displayName },
                { onConflict: "user_id", ignoreDuplicates: true }
            );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("claim-session error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
