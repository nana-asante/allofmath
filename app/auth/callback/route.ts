import { NextResponse } from "next/server";
// The client you created from the Server Client code snippet
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get("next") ?? "/me";

    if (code) {
        const supabase = await createSupabaseServerClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            // Claim anonymous session in background (we can await it, it's fast)
            // Use direct DB update to avoid 401 issues with fetch cookies
            const { getSessionHash } = await import("@/lib/session");
            const sessionHash = await getSessionHash();

            if (sessionHash) {
                const { claimSession } = await import("@/lib/claim-session");
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    // Ensure we pass user metadata for profile creation
                    await claimSession(user.id, sessionHash, user.user_metadata);
                }
            }

            // Forward to protected route
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/sign-in?error=auth-code-error`);
}
