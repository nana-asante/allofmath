/**
 * Convert Elo rating to display level.
 * Level 1 = rating 1000-1099
 * Level 2 = rating 1100-1199
 * etc. No maximum.
 */
export function ratingToLevel(rating: number): number {
    return Math.max(1, 1 + Math.floor((rating - 1000) / 100));
}

/**
 * Convert display level to approximate rating.
 * Inverse of ratingToLevel, returns center of range.
 */
export function levelToRating(level: number): number {
    return 1000 + (level - 1) * 100 + 50;
}

/**
 * Convert seed difficulty (1-20) to initial rating.
 * Each seed step adds 60 rating points.
 */
export function seedToRating(seed: number): number {
    return 1000 + (seed - 1) * 60;
}
