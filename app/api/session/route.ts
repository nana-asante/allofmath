import { NextRequest, NextResponse } from "next/server";
import { getOrCreateSession, createSessionCookie } from "@/lib/session";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
    // Rate limit session creation by IP to prevent bot spam
    const ip = getClientIP(request);
    const rateLimit = await checkRateLimit(`ip:${ip}`, "session");

    if (!rateLimit.success) {
        const retryAfter = Math.ceil((rateLimit.reset - Date.now()) / 1000);
        return NextResponse.json(
            { error: "Too many requests. Please try again later." },
            { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfter)) } }
        );
    }

    const { sessionToken, sessionHash } = await getOrCreateSession();

    const response = NextResponse.json({ sessionHash });

    const cookie = createSessionCookie(sessionToken);
    response.cookies.set(cookie.name, cookie.value, cookie.options);

    return response;
}
