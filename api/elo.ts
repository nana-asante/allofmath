import "server-only";

export type MatchScore = 0 | 0.5 | 1;

/**
 * Calculate expected score for player A against player B.
 * Standard Elo formula.
 */
export function expectedScore(rA: number, rB: number): number {
    return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

/**
 * Get K-factor based on number of votes.
 * Higher K early for fast learning, lower K later for stability.
 */
export function kFactor(nVotes: number): number {
    if (nVotes < 10) return 64;
    if (nVotes < 50) return 32;
    if (nVotes < 200) return 16;
    return 8;
}

/**
 * Update Elo ratings after a match.
 * @param rA - Current rating of player A
 * @param rB - Current rating of player B  
 * @param sA - Actual score for A (1 = win, 0.5 = draw, 0 = loss)
 * @param k - K-factor for this match
 * @returns New ratings for both players
 */
export function updateElo(
    rA: number,
    rB: number,
    sA: MatchScore,
    k: number
): { rA: number; rB: number } {
    const eA = expectedScore(rA, rB);
    const delta = Math.round(k * (sA - eA));
    return {
        rA: Math.max(400, Math.min(4000, rA + delta)), // Clamp to prevent runaway
        rB: Math.max(400, Math.min(4000, rB - delta)),
    };
}

/**
 * Convert vote to match score for the previous problem.
 * - "easier" = current was easier, so prev "wins" (harder)
 * - "harder" = current was harder, so prev "loses"
 * - "same" = draw
 */
export function voteToScore(vote: "easier" | "same" | "harder"): MatchScore {
    switch (vote) {
        case "easier":
            return 1; // prev is harder (wins)
        case "harder":
            return 0; // prev is easier (loses)
        case "same":
            return 0.5;
    }
}
