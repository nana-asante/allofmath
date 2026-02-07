import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// If env vars are missing (preview/dev), don't crash at import-time.
const redis =
    UPSTASH_URL && UPSTASH_TOKEN ? new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN }) : null;

function isProd() {
    return process.env.NODE_ENV === "production";
}

// Rate limiters (only if redis available)
const attemptLimiter =
    redis &&
    new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "60 s"),
        prefix: "ratelimit:attempt",
        analytics: true,
    });

const voteLimiter =
    redis &&
    new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, "60 s"),
        prefix: "ratelimit:vote",
        analytics: true,
    });

const sessionLimiter =
    redis &&
    new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "60 s"),
        prefix: "ratelimit:session",
        analytics: true,
    });

export interface RateLimitResult {
    success: boolean;
    remaining: number;
    reset: number;
    limit: number;
}

export type WriteRateLimitType = "attempt" | "vote";
export type SessionRateLimitType = "session";

/** Normalize keys so attackers can't create giant Redis keys. */
function normKey(s: string): string {
    return s.trim().toLowerCase().slice(0, 200);
}

async function limitOrFallback(
    limiter: Ratelimit | null | false,
    key: string
): Promise<RateLimitResult> {
    const safeKey = normKey(key);

    // If Redis isn't configured:
    // - allow in dev for convenience
    // - deny in prod for safety (prevents unthrottled abuse)
    if (!limiter) {
        if (!isProd()) {
            return { success: true, remaining: 999999, reset: Date.now() + 60_000, limit: 999999 };
        }
        return { success: false, remaining: 0, reset: Date.now() + 60_000, limit: 0 };
    }

    const result = await limiter.limit(safeKey);
    return {
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
        limit: result.limit,
    };
}

export async function checkRateLimit(key: string, type: SessionRateLimitType): Promise<RateLimitResult>;
export async function checkRateLimit(key: string, type: WriteRateLimitType): Promise<RateLimitResult>;
export async function checkRateLimit(key: string, type: WriteRateLimitType | SessionRateLimitType) {
    const limiter =
        type === "attempt" ? attemptLimiter :
            type === "vote" ? voteLimiter :
                sessionLimiter;

    return limitOrFallback(limiter, key);
}

/**
 * Dual rate limit for write endpoints only.
 * If IP is unknown, skip IP limiting to avoid global coupling.
 */
export async function checkDualRateLimit(
    ip: string,
    sessionHash: string,
    type: WriteRateLimitType
): Promise<{ success: boolean; reset: number }> {
    const ipKnown = ip !== "unknown" && ip.length > 0;

    const [ipResult, sessionResult] = await Promise.all([
        ipKnown ? checkRateLimit(`ip:${ip}`, type) : Promise.resolve({ success: true, remaining: 0, reset: 0, limit: 0 }),
        checkRateLimit(`sess:${sessionHash}`, type),
    ]);

    const success = ipResult.success && sessionResult.success;
    const reset = Math.max(ipResult.reset || 0, sessionResult.reset || 0);

    return { success, reset };
}

/**
 * Vercel-friendly IP extraction
 */
export function getClientIP(request: Request): string {
    const vercel = request.headers.get("x-vercel-forwarded-for");
    if (vercel) return vercel.split(",")[0]!.trim();

    const xff = request.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0]!.trim();

    const real = request.headers.get("x-real-ip");
    if (real) return real.trim();

    return "unknown";
}
