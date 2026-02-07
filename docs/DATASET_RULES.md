# Dataset Rules

These rules ensure the allofmath problem corpus remains high-quality, legally sound, and useful for the community.

## Licensing Requirements

### Accepted Licenses

| License | Description | Requirements |
|---------|-------------|--------------|
| CC0 | Public Domain | None - preferred for original work |
| CC BY 4.0 | Attribution | Must credit original author |
| CC BY-SA 4.0 | Attribution-ShareAlike | Credit author, same license |

### Not Accepted

- Problems copied from copyrighted textbooks without permission
- Contest problems without explicit license (IMO, AMC, etc.)
- Problems with "All Rights Reserved" notices
- Any content with unclear ownership

## Content Guidelines

### What We Accept

✅ Original problems you create  
✅ Problems from explicitly open-licensed sources  
✅ Classical/historical problems (ancient math, etc.)  
✅ Standard curriculum problems (basics like 1+1)  

### What We Don't Accept

❌ Direct copies from commercial textbooks  
❌ Problems from paid platforms (Khan Academy exercises, etc.)  
❌ Contest problems without written permission  
❌ AI-generated problems without human verification  

## Problem Quality

### Required

- Clear, unambiguous wording
- Single correct answer (subject to change)
- Appropriate difficulty rating (1-20 scale)
- Proper mathematical notation

### Best Practices

- Include units where applicable
- Use standard mathematical conventions
- Keep prompts concise but complete
- Test your answer is correct!

## Bulk Uploads (>50 problems)

For large contributions:

1. Create a separate file: `data/batches/YOURNAME_YYYYMMDD.jsonl`
2. Include a manifest: `data/batches/YOURNAME_YYYYMMDD.manifest.json`

### Manifest Format

```json
{
  "contributor": "github-username",
  "date": "2024-01-15",
  "count": 150,
  "source": "Description of where problems came from",
  "license": "CC0",
  "notes": "Any additional context"
}
```

### Limits

- Maximum 5000 problems per PR
- Must pass all validation checks
- Maintainer review required for >500 problems

## Attribution

Always include these fields:

| Field | Required | Description |
|-------|----------|-------------|
| `source` | Yes | Where the problem originated |
| `license` | Yes | One of accepted licenses above |
| `author` | Yes | GitHub username of contributor |

## Verification Process

1. **Community**: All new submissions start as `status: "community"`
2. **Review**: Maintainers review for accuracy and appropriateness
3. **Verified**: Promoted to `status: "verified"` after review

## Questions?

Open an issue on GitHub if you're unsure about licensing or sourcing for specific problems.
