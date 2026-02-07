
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function claimSession(userId: string, sessionHash: string, userMetadata: any = {}) {
    try {
        console.log(`Claiming session ${sessionHash} for user ${userId}`);

        // 1. Update attempts
        const { error: attemptsError } = await supabaseAdmin
            .from("attempts")
            .update({ user_id: userId })
            .eq("session_hash", sessionHash)
            .is("user_id", null);

        if (attemptsError) {
            console.error("claim-session attempts error:", attemptsError);
        }

        // 2. Update votes
        const { error: votesError } = await supabaseAdmin
            .from("pairwise_votes")
            .update({ user_id: userId })
            .eq("session_hash", sessionHash)
            .is("user_id", null);

        if (votesError) {
            console.error("claim-session votes error:", votesError);
        }

        // 3. Initialize user stats (if not exists)
        await supabaseAdmin
            .from("user_ratings")
            .upsert(
                { user_id: userId, rating: 1000, n_attempts: 0 },
                { onConflict: "user_id", ignoreDuplicates: true }
            );

        // 4. Init profile (if not exists) using metadata
        const displayName =
            userMetadata.full_name ||
            userMetadata.name ||
            userMetadata.email?.split("@")[0] ||
            "Anonymous";

        await supabaseAdmin
            .from("profiles")
            .upsert(
                { user_id: userId, display_name: displayName },
                { onConflict: "user_id", ignoreDuplicates: true }
            );

        return { success: true };
    } catch (error) {
        console.error("claimSession error:", error);
        return { success: false, error };
    }
}
