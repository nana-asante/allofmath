# Contributing to allofmath

Thank you for your interest in contributing to allofmath! This project aims to compile all existing solved math problems in history, and we welcome contributions from everyone.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- Git

### Setup

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/allofmath.git
   cd allofmath
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Run the development server:
   ```bash
   pnpm dev
   ```

## Contributing Problems

The most valuable contribution you can make is adding math problems to our dataset.

### Adding Problems

1. Create a new JSON file in `data/problems/[topic]/` (e.g., `data/problems/algebra/aom_algebra_0001.json`)
2. Add problem in JSON format:
   ```json
   {"id":"aom_TOPIC_NNNN","topic":"Topic","seed_difficulty":1,"prompt":"Problem text","answer":{"kind":"number","value":42},"status":"community","source":"original","license":"CC0","author":"your-github-username"}
   ```
3. Run validation:
   ```bash
   pnpm dataset:validate
   ```
4. Commit and open a PR

### Problem ID Format

- Pattern: `aom_[topic]_[number]`
- Example: `aom_algebra_0042`
- Use lowercase and underscores only

### Required Fields

| Field | Description |
|-------|-------------|
| `id` | Unique identifier (see format above) |
| `topic` | Math topic (e.g., "Arithmetic", "Algebra") |
| `seed_difficulty` | 1-20 scale (see guide below) |
| `prompt` | The problem text |
| `answer` | Object with `kind` and `value` (see formats below) |
| `status` | Always `"community"` for new submissions |
| `source` | Where the problem came from |
| `license` | License (CC0, CC BY 4.0, etc.) |
| `author` | Your GitHub username |

### Difficulty Scale (seed_difficulty)

Rate problems on a 1-20 scale based on expected audience:


| Level | Grade / Category | Topics / Examples |
|-------|------------------|-------------------|
| 1–3 | Elementary | Basic arithmetic: 2+3, 10-4, 3×4 |
| 4–6 | Middle School | Fractions, decimals, basic algebra |
| 7–9 | Pre-Algebra | Equations, ratios, percentages |
| 10–12 | Algebra I | Linear equations, polynomials |
| 13–15 | Algebra II / Geometry | Quadratics, proofs, trigonometry |
| 16–18 | Precalculus / Calculus | Limits, derivatives, integrals |
| 19–20 | Competition / Advanced | Olympiad-style, proofs, number theory |

Your initial rating is a "seed" — the community will refine it through voting over time.

### Answer Formats

Answers use a `kind` field to specify the format:

**Numeric answers** (most common):
```json
{
  "answer": {
    "kind": "number",
    "value": 42
  }
}
```

With tolerance (for decimals/approximations):
```json
{
  "answer": {
    "kind": "number",
    "value": 3.14159,
    "tolerance": 0.001
  }
}
```

**Important:** If you omit `tolerance`, it defaults to `0`, meaning the user must enter the **exact** number. For decimal answers, always specify an appropriate tolerance.

**Exact string answers** (formulas, expressions, text):
```json
{
  "answer": {
    "kind": "exact",
    "value": "x^2 + 2x + 1"
  }
}
```

### Problem Status

| Status | Meaning | Who sets it |
|--------|---------|-------------|
| `"community"` | New submission, awaiting review | Contributor (always use this) |
| `"verified"` | Answer confirmed correct by maintainers | Maintainers only |

**Contributors should always set `status: "community"`**. Maintainers will promote to `"verified"` after reviewing the problem.

### Licensing Requirements

- All problems must have explicit licensing
- Preferred: CC0 (public domain) or CC BY 4.0
- **No copying from copyrighted textbooks or contests without permission**

See [docs/DATASET_RULES.md](docs/DATASET_RULES.md) for detailed rules.

## Code Contributions

### Before You Start

1. Check existing issues for related work
2. Open an issue to discuss significant changes
3. Follow our coding standards (ESLint + TypeScript)

### Pull Request Process

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Run all checks:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm dataset:validate
   ```
4. Commit with a descriptive message
5. Push and open a PR

### PR Requirements

- [ ] All CI checks pass
- [ ] Code follows existing patterns
- [ ] New features include tests (if applicable)
- [ ] Documentation updated (if applicable)

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Questions?

Open an issue or start a discussion on GitHub!
