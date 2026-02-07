# Contributing Problems to AllOfMath

Thanks for helping build the world's largest open math problem database! Here's the simplest way to contribute.

---

## Before You Start

1. **Fork** this repository on GitHub
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/allofmath.git
   cd allofmath
   ```
3. **Install dependencies**:
   ```bash
   pnpm install
   ```

---

## Add Problems in 4 Steps

### Step 1: Create `import.json` in the project root

Create a file called `import.json` in the main project folder with your problems:

```json
[
  {
    "id": "aom_addition_0002",
    "topic": "Arithmetic",
    "seed_difficulty": 2,
    "prompt": "$3 + 4 = ?$",
    "answer": {
      "kind": "number",
        "value": 7,
        "tolerance": 0
    },
    "status": "community",
    "source": "original",
    "license": "CC0",
    "author": "your-github-username",
    "solution_video_url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"
  }
]
```

> **Note:** Use `https://www.youtube.com/watch?v=jNQXAC9IVRw` as a placeholder video URL until a real solution video exists.

### Step 2: Import your problems

Run this command **from the project root folder** (where `package.json` is):

```bash
npx tsx scripts/import-problems.ts import.json
```

This creates individual problem files in `data/problems/[topic]/`.

### Step 3: Validate the dataset

Run this command **from the project root folder**:

```bash
pnpm dataset:validate
```

#### Fixing Errors

**"Duplicate ID" error:**
```
Duplicate ID: aom_arithmetic_9001
```
Run the auto-fix script and re-validate:
```bash
npx tsx scripts/fix-duplicate-ids.ts
pnpm dataset:validate
```

**"Duplicate problem / Exact prompt match" error:**
```
Duplicate problem detected!
  File: algebra/aom_algebra_0001.json
  Matches: algebra/aom_algebra_0042.json
  (Exact prompt match)
```
This means two problems have the same question. You must either:
- Delete one of the duplicate files, OR  
- Edit one prompt to be different

Then run `pnpm dataset:validate` again.

### Step 4: Submit a Pull Request

Once validation passes, commit your changes and open a PR!

---

## Problem Format Reference

### Required Fields

| Field | What to put |
|-------|-------------|
| `id` | `aom_[topic]_[number]` (e.g., `aom_algebra_0042`) |
| `topic` | `Arithmetic`, `Algebra`, `Geometry`, `Calculus`, etc. |
| `seed_difficulty` | 1-20 (see scale below) |
| `prompt` | The question (wrap math in `$...$` for LaTeX) |
| `answer` | `{ "kind": "number", "value": 42 }` |
| `status` | Always use `"community"` |
| `source` | `"original"` or where you found it |
| `license` | `"CC0"` or `"CC BY 4.0"` |
| `author` | Your GitHub username |

### Optional Fields

| Field | What to put |
|-------|-------------|
| `solution_video_url` | YouTube link (use placeholder if none) |
| `tolerance` | For decimal answers: `{ "kind": "number", "value": 3.14, "tolerance": 0.01 }` |

### Difficulty Scale

| Level | Who it's for |
|-------|--------------|
| 1-3 | Elementary: `2+3`, `10-4` |
| 4-6 | Middle School: fractions, decimals |
| 7-9 | Pre-Algebra: equations, percentages |
| 10-12 | Algebra I: linear equations |
| 13-15 | Algebra II: quadratics, trig |
| 16-18 | Calculus: derivatives, integrals |
| 19-20 | Competition: Olympiad-level |

---

## LaTeX in Prompts

Wrap math expressions in dollar signs:

| Type | Example |
|------|---------|
| Pure math | `"$1 + 2 = ?$"` |
| Mixed text | `"Solve for x: $2x + 3 = 7$"` |
| Fractions | `"$\\frac{1}{2} + \\frac{1}{3} = ?$"` |
| Exponents | `"$e^{2x} = ?$"` (use braces `{}` for multi-char exponents) |

---

## Questions?

Open an issue on GitHub!
