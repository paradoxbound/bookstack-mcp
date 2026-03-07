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

## Making changes

1. Fork the repository and create a branch from `main`
2. Make your changes
3. Ensure `npm run type-check` and `npm run build` pass
4. If you have a BookStack instance available, run `npm test` with the required environment variables (see below)
5. Open a pull request against `main`

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
