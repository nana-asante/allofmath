import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/api/supabase-admin";
import { requireAdmin } from "@/api/admin-auth";

export const runtime = "nodejs";

/**
 * GET /api/admin/challenges
 * List pending challenges that haven't been synced to GitHub yet.
 */
export async function GET(request: NextRequest) {
    if (!requireAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from("answer_challenges")
            .select("id,problem_id,user_answer,expected_answer,reason,status,created_at,github_issue_number")
            .eq("status", "pending")
            .is("github_issue_number", null)
            .order("created_at", { ascending: true })
            .limit(50);

        if (error) {
            console.error("fetch challenges error:", error);
            return NextResponse.json({ error: "DB error" }, { status: 500 });
        }

        return NextResponse.json({ challenges: data ?? [] });
    } catch (error) {
        console.error("challenges error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

/**
 * POST /api/admin/challenges
 * Update challenge with GitHub issue number after issue is created.
 * Body: { challengeId: number, issueNumber: number }
 */
export async function POST(request: NextRequest) {
    if (!requireAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { challengeId, issueNumber } = body;

        if (!challengeId || !issueNumber) {
            return NextResponse.json({ error: "Missing challengeId or issueNumber" }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from("answer_challenges")
            .update({ github_issue_number: issueNumber })
            .eq("id", challengeId);

        if (error) {
            console.error("update challenge error:", error);
            return NextResponse.json({ error: "DB error" }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("challenges update error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

/**
 * PATCH /api/admin/challenges
 * Resolve a challenge by issue number (called when issue is closed).
 * Body: { issueNumber: number, resolution: "accepted" | "rejected" }
 */
export async function PATCH(request: NextRequest) {
    if (!requireAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { issueNumber, resolution } = body;

        if (!issueNumber || !["accepted", "rejected"].includes(resolution)) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from("answer_challenges")
            .update({
                status: resolution,
                reviewed_at: new Date().toISOString(),
            })
            .eq("github_issue_number", issueNumber);

        if (error) {
            console.error("resolve challenge error:", error);
            return NextResponse.json({ error: "DB error" }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("challenges resolve error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
