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
            // Claim anonymous session in background (don't await to speed up redirect)
            // We use fetch to call our own API route
            await fetch(`${origin}/api/auth/claim-session`, {
                method: "POST",
                headers: {
                    // Forward cookies for auth
                    Cookie: request.headers.get("cookie") || "",
                },
            }).catch((err) => console.error("Failed to claim session:", err));

            // Forward to protected route
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/sign-in?error=auth-code-error`);
}
