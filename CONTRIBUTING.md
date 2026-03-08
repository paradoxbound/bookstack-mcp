# Contributing to BookStack MCP

Thank you for your interest in contributing!

## Getting started

```bash
git clone https://github.com/paradoxbound/bookstack-mcp.git
cd bookstack-mcp
npm install
npm run build
npm run type-check
```

## Project structure

- `packages/core/` — BookStack API client and shared types (no runtime dependencies)
- `packages/stdio/` — MCP server with stdio transport

## Developer Certificate of Origin (DCO)

All commits must include a `Signed-off-by` line asserting that you are legally authorised to make the contribution under the project's MIT License (see the [Developer Certificate of Origin](https://developercertificate.org/)).

Sign off automatically with:

```bash
git commit -s -m "your commit message"
```

This adds `Signed-off-by: Your Name <your@email.com>` to the commit message. A CI check enforces this on every pull request.

To fix unsigned commits before opening a PR:

```bash
git rebase --signoff HEAD~<number-of-commits>
```

## Making changes

1. Fork the repository and create a branch from `main`
2. Make your changes
3. Ensure `npm run type-check` and `npm run build` pass
4. If you have a BookStack instance available, run `npm test` with the required environment variables (see below)
5. Sign off all commits (see DCO section above)
6. Open a pull request against `main`

## Running tests

Unit and fuzz tests run without a BookStack instance:

```bash
npm test
```

Functional tests require a live BookStack instance:

```bash
export TEST_BOOKSTACK_URL=https://your-bookstack.example.com
export TEST_BOOKSTACK_TOKEN_ID=your-token-id
export TEST_BOOKSTACK_TOKEN_SECRET=your-token-secret
npm test
```

## Reporting security vulnerabilities

Please do **not** open a public issue for security vulnerabilities. Use the process described in [SECURITY.md](SECURITY.md).

## Code style

- TypeScript strict mode
- Native `fetch` only — no axios or other HTTP clients
- Zod schemas for all MCP tool inputs
- Error handling via `error.status` / `error.response` (not axios patterns)
