# π All of Math

An attempt to compile all existing solved math problems in history.

[![CI](https://github.com/nana-asante/allofmath/actions/workflows/ci.yml/badge.svg)](https://github.com/nana-asante/allofmath/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## What is this?

All of Math is an open-source, community-driven database of math problems spanning all topics and difficulty levels. Problems are stored as structured JSON files, validated by CI, and served through a modern web interface.

**🌐 Live:** [allofmath.org](https://allofmath.org)

## Features

- **Searchable problem database** with full-text search
- **Difficulty ratings** powered by Elo algorithm and community voting
- **Solution videos** linked where available
- **Answer challenges** — disagree with an answer? Submit a challenge that creates a GitHub Issue for review
- **Open dataset** — all problems are in `data/problems/` as JSON files

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10+

### Installation

```bash
# Clone the repo
git clone https://github.com/nana-asante/allofmath.git
cd allofmath

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase/Upstash credentials

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
allofmath/
├── app/                  # Next.js App Router pages & API routes
├── components/           # React components
├── data/
│   ├── problems/         # Math problems (JSON files)
│   └── schema/           # Zod validation schemas
├── lib/                  # Shared utilities and libraries
├── public/               # Static assets
├── scripts/              # Maintenance scripts
├── supabase/             # Database migrations
└── docs/                 # Documentation
```

## Contributing

We welcome contributions! The most valuable contribution is **adding math problems**.

### Adding Problems

1. Create a new JSON file in `data/problems/[topic]/`
2. Follow the [Dataset Rules](docs/DATASET_RULES.md)
3. Run `pnpm dataset:validate` to check your work
4. Open a PR!

See [CONTRIBUTING.md](CONTRIBUTING.md) for full details.

### Problem Format

```json
{
  "id": "aom_arithmetic_0001",
  "topic": "Arithmetic",
  "seed_difficulty": 1,
  "prompt": "2 + 2",
  "answer": { "kind": "number", "value": 4 },
  "status": "community",
  "source": "original",
  "license": "CC0",
  "author": "your-github-username"
}
```

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Rate Limiting:** Upstash Redis
- **Styling:** Tailwind CSS
- **Hosting:** Vercel

## License

MIT — see [LICENSE](LICENSE)

The problem dataset is licensed per-problem (see each problem's `license` field).

## Links

- [Contributing Guide](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)
- [Dataset Rules](docs/DATASET_RULES.md)
