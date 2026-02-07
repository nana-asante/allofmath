import "server-only";

/**
 * Strip LaTeX commands from a string for plain-text indexing.
 * This is a simple approach - handles common patterns.
 */
export function stripLatex(input: string): string {
    let result = input;

    // Remove display math: \[ ... \] and $$ ... $$
    result = result.replace(/\\\[[\s\S]*?\\\]/g, " ");
    result = result.replace(/\$\$[\s\S]*?\$\$/g, " ");

    // Remove inline math: $ ... $ but keep content
    result = result.replace(/\$([^$]+)\$/g, "$1");

    // Remove common LaTeX commands but keep their content
    // \frac{a}{b} -> a/b
    result = result.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "$1/$2");

    // \sqrt{x} -> sqrt(x)
    result = result.replace(/\\sqrt\{([^}]*)\}/g, "sqrt($1)");

    // \text{...} -> ...
    result = result.replace(/\\text\{([^}]*)\}/g, "$1");

    // Remove other commands: \command{...} -> ...
    result = result.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, "$1");

    // Remove standalone commands: \alpha, \beta, etc -> alpha, beta
    result = result.replace(/\\([a-zA-Z]+)/g, "$1");

    // Clean up braces and special chars
    result = result.replace(/[{}\\]/g, " ");

    // Normalize whitespace
    result = result.replace(/\s+/g, " ").trim();

    return result;
}

/**
 * Convert topic to URL-safe slug.
 */
export function topicToSlug(topic: string): string {
    return topic
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}
