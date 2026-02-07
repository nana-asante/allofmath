import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";

const SESSION_COOKIE_NAME = "aom_session";
const SESSION_EXPIRY_DAYS = 30;

export async function getOrCreateSession(): Promise<{
    sessionToken: string;
    sessionHash: string;
    isNew: boolean;
}> {
    const cookieStore = await cookies();
    const existingToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (existingToken && existingToken.length === 64) {
        return {
            sessionToken: existingToken,
            sessionHash: hashSession(existingToken),
            isNew: false,
        };
    }

    // Generate new secure random token
    const sessionToken = randomBytes(32).toString("hex");
    return {
        sessionToken,
        sessionHash: hashSession(sessionToken),
        isNew: true,
    };
}

export function hashSession(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

export function createSessionCookie(sessionToken: string): {
    name: string;
    value: string;
    options: {
        httpOnly: boolean;
        secure: boolean;
        sameSite: "lax";
        path: string;
        maxAge: number;
    };
} {
    return {
        name: SESSION_COOKIE_NAME,
        value: sessionToken,
        options: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * SESSION_EXPIRY_DAYS,
        },
    };
}

export async function getSessionHash(): Promise<string | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return hashSession(token);
}
