# Security Policy

## Reporting a Vulnerability

We take security seriously at allofmath. If you discover a security vulnerability, please report it responsibly.

### How to Report

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email us at: **n.asanetj@gmail.com** (or open a private security advisory on GitHub)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

### What to Expect

- We will acknowledge your report within 48 hours
- We will investigate and provide updates on our progress
- We will credit you in our security acknowledgments (unless you prefer anonymity)

### Scope

This policy covers:
- The allofmath.org website
- The allofmath's future API
- The problem dataset validation system

### Out of Scope

- Issues in dependencies (please report to the respective maintainers)
- Social engineering attacks
- Physical security issues

## Security Best Practices

When contributing to allofmath:
- Never commit secrets or API keys
- Always validate user input server-side
- Use parameterized queries (we use Supabase's type-safe client)
- Follow the principle of least privilege

Thank you for helping keep allofmath secure!
