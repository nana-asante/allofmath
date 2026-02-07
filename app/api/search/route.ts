import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const runtime = "edge";

// Input validation schema
const SearchParamsSchema = z.object({
    q: z.string().min(1).max(200),
    topic: z.string().max(60).optional(),
    limit: z.coerce.number().int().min(1).max(20).default(20),
    offset: z.coerce.number().int().min(0).max(2000).default(0),
});

// Simple in-memory rate limiting (per-instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60; // requests per minute
const RATE_WINDOW = 60000; // 1 minute in ms

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || entry.resetAt < now) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
        return true;
    }

    if (entry.count >= RATE_LIMIT) {
        return false;
    }

    entry.count++;
    return true;
}

export async function GET(request: NextRequest) {
    // Get client IP for rate limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";

    if (!checkRateLimit(ip)) {
        return NextResponse.json(
            { error: "Rate limit exceeded. Try again later." },
            { status: 429 }
        );
    }

    // Parse and validate query params
    const { searchParams } = new URL(request.url);
    const rawParams = {
        q: searchParams.get("q") ?? "",
        topic: searchParams.get("topic") ?? undefined,
        limit: searchParams.get("limit") ?? undefined,
        offset: searchParams.get("offset") ?? undefined,
    };

    const parsed = SearchParamsSchema.safeParse(rawParams);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid parameters", details: parsed.error.issues },
            { status: 400 }
        );
    }

    const { q, topic, limit, offset } = parsed.data;

    try {
        // Create anon client for RPC call
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase.rpc("search_problems", {
            q,
            topic_filter: topic ?? null,
            lim: limit,
            off: offset,
        });

        if (error) {
            console.error("Search RPC error:", error);
            return NextResponse.json(
                { error: "Search failed" },
                { status: 500 }
            );
        }

        return NextResponse.json(data ?? [], {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("Search error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
