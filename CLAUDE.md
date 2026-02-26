# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BookStack MCP (Model Context Protocol) Server v2.5.0 - Monorepo: **packages/core** (BookStack API client using native `fetch` + shared types) and **packages/stdio** (MCP server with stdio transport). Uses McpServer + registerTool() for clean, maintainable code.

## Build & Development Commands

### Build
```bash
npm install              # Install dependencies (includes zod)
npm run build           # Compile TypeScript to dist/
npm run type-check      # Type-check without emitting files
npm test                # Run functional tests (needs TEST_BOOKSTACK_* env vars)
```

### Development
```bash
npm run dev             # Start server with hot reload (tsx)
```

### Production
```bash
npm start               # Run stdio server (node packages/stdio/dist/index.js)
```

## Architecture

### Monorepo (v2.5.0)

- **packages/core** (`@bookstack-mcp/core`) – Shared BookStack API client and types. Uses **native `fetch`** only (no axios). Entry: `packages/core/src/bookstack-client.ts` and `packages/core/src/types.ts`.
- **packages/stdio** (`bookstack-mcp-stdio`) – MCP server with stdio transport. Imports `BookStackClient` and `BookStackConfig` from `@bookstack-mcp/core`. Entry: `packages/stdio/src/index.ts`.

**Key Design Decisions:**
- **Native fetch** – Core client uses only `fetch`; API errors set `error.status` and `error.response` for tool error handling.
- **Stdio only** – Single transport for local, LibreChat, Claude Desktop.
- **Workspaces** – Root `package.json` has `"workspaces": ["packages/core", "packages/stdio"]`; build/test at root run in workspaces.

### Data Flow

```
MCP Client (LibreChat/Claude Desktop/Smithery)
  ↓
Stdio Transport (packages/stdio)
  ↓
McpServer - ListTools/CallTool
  ↓
Tool handlers - call BookStackClient from @bookstack-mcp/core
  ↓
BookStackClient (native fetch) - API calls, response enhancement
  ↓
Enhanced JSON with URLs, previews, metadata
```

### Core Components

**packages/core**
- `src/bookstack-client.ts` – Fetch-based HTTP client, token auth, timeouts, `request()` / `requestForm()`; all entity methods; response enhancement (URLs, previews, dates).
- `src/types.ts` – Shared types (BookStackConfig, Book, Page, Chapter, Shelf, etc.).
- `tests/` – Functional tests (global-setup, read-tools, write-tools, write-gate); import `@bookstack-mcp/core`.

**packages/stdio**
- `src/index.ts` – Env validation, McpServer, tool registration (read + write when enabled), stdio transport. Error handling uses `error.status` / `error.response` (no axios).

## Configuration

### Environment Variables
```env
BOOKSTACK_BASE_URL=https://your-bookstack.com   # Required
BOOKSTACK_TOKEN_ID=your-token-id                # Required
BOOKSTACK_TOKEN_SECRET=your-token-secret        # Required
BOOKSTACK_ENABLE_WRITE=false                    # Optional
```

### TypeScript Configuration
- Target: ES2022 with ESNext modules
- Output: `dist/` directory
- Strict mode enabled
- Source maps and declarations generated

## Deployment Options

### Local (Claude Desktop)
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "bookstack": {
      "command": "node",
      "args": ["/path/to/packages/stdio/dist/index.js"],
      "env": { "BOOKSTACK_BASE_URL": "...", ... }
    }
  }
}
```

### LibreChat
Add to `librechat.yaml`:
```yaml
mcpServers:
  bookstack:
    command: npx
    args: ["-y", "bookstack-mcp"]
    env:
      BOOKSTACK_BASE_URL: "https://..."
      BOOKSTACK_TOKEN_ID: "..."
      BOOKSTACK_TOKEN_SECRET: "..."
```

### Remote (Smithery.ai)
Will be hosted at `bookstack-mcp.webmodule.org` for public use.

## Key Implementation Details

### Tool Registration Pattern

Each tool follows this pattern:
```typescript
server.registerTool(
  "tool_name",
  {
    title: "Human-Readable Title",
    description: "What this tool does",
    inputSchema: {
      param: z.string().describe("Parameter description"),
      optional: z.number().optional().describe("Optional param")
    }
  },
  async (args) => {
    const result = await client.someMethod(args.param, args.optional);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
    };
  }
);
```

Benefits:
- Type-safe with Zod validation
- Automatic schema generation for clients
- Clean, declarative syntax
- Error handling built-in

### Write Operations Security

Write tools only registered when `BOOKSTACK_ENABLE_WRITE=true`:
```typescript
if (config.enableWrite) {
  server.registerTool("create_page", ...);
  server.registerTool("update_page", ...);
  // ... other write tools
}
```

This prevents accidental exposure of write operations.

### URL Generation Strategy

All URLs use **slugs** instead of IDs when available:
- Format: `{baseUrl}/books/{book.slug}/page/{page.slug}`
- Falls back to IDs if slugs unavailable
- More readable and stable

### Export Handling

Binary formats (PDF, ZIP) return metadata with direct BookStack URLs:
```typescript
if (typeof content === 'object' && content.download_url) {
  return {
    content: [{
      type: "text",
      text: `✅ **PDF Export Ready**\n\n🚀 **Direct Download Link:**\n${content.download_url}`
    }]
  };
}
```

Text formats return content directly.

### Response Enhancement

All API responses enhanced with:
- Direct URLs and markdown links
- Content previews (150-200 chars)
- Human-friendly dates
- Word counts for pages
- Contextual location info
- Rich metadata

## Common Workflows

### Adding a New Tool

1. Add method to `BookStackClient` if needed (`packages/core/src/bookstack-client.ts`).
2. Register tool in `packages/stdio/src/index.ts` using `server.registerTool()`:
```typescript
server.registerTool(
  "new_tool",
  {
    title: "Tool Title",
    description: "What it does",
    inputSchema: {
      param: z.string().describe("Param description")
    }
  },
  async (args) => {
    const result = await client.newMethod(args.param);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);
```
3. If write operation, add inside `if (config.enableWrite) { ... }` block

### Modifying Response Enhancement

Edit private enhancement methods in `packages/core/src/bookstack-client.ts` (e.g. `enhanceBookResponse`, `enhancePageResponse`, `enhanceChapterResponse`, `enhanceShelfResponse`, `enhanceSearchResults`). All enhancement logic is in the core client.

### Testing Changes

```bash
# From repo root
npm run type-check
npm run dev
npm run build
npm start   # node packages/stdio/dist/index.js
npm test   # runs packages/core tests

# Test with LibreChat
# Add to librechat.yaml and restart LibreChat
```

## Dependencies

- **packages/core** – No runtime deps; uses native `fetch`. Dev: typescript, vitest.
- **packages/stdio** – `@bookstack-mcp/core`, `@modelcontextprotocol/sdk`, `zod`. Dev: typescript, tsx, @types/node.

## Migration from v1.0

### What Changed

1. **Single entry point** - `src/index.ts` replaces multiple files
2. **Modern API** - `McpServer` + `registerTool()` instead of manual handlers
3. **Removed complexity** - No SSE, no supergateway, no separate transport layer
4. **Stdio only** - Universal transport works everywhere
5. **Zod schemas** - Type-safe input validation
6. **Simpler deployment** - Just works with LibreChat, Claude Desktop, Smithery

### v2.5.0 Monorepo

- **packages/core** – BookStack client + types; native `fetch` only (no axios).
- **packages/stdio** – MCP server entry; depends on `@bookstack-mcp/core`.
- Root `src/` removed; tests live in `packages/core/tests`. Docker and CI build from root; image runs `node packages/stdio/dist/index.js`.

## Debugging

### Check Server Output

```bash
# Logs go to stderr to avoid stdio protocol interference
npm run dev
# Look for:
# "Initializing BookStack MCP Server..."
# "BookStack URL: https://..."
# "Write operations: DISABLED"
# "BookStack MCP server running on stdio"
```

### Test BookStack API

```bash
curl -H "Authorization: Token $BOOKSTACK_TOKEN_ID:$BOOKSTACK_TOKEN_SECRET" \
  $BOOKSTACK_BASE_URL/api/docs
```

### LibreChat Troubleshooting

1. Check `librechat.yaml` syntax
2. Verify environment variables are set correctly
3. Restart LibreChat after config changes
4. Check LibreChat logs: `docker compose logs -f api`

## CI/CD Pipeline

### Workflow Overview

| Workflow | Trigger | Purpose |
|---|---|---|
| `functional-tests.yml` | PR + push to main | Build, type-check, run functional tests |
| `docker-publish.yml` | PR + push to main | PR: Dockerfile validate + full CD pre-check. Post-merge: build, verify, merge manifest, tag, clean up |
| `auto-tag.yml` | _(retired — no trigger)_ | Kept as documentation only; logic moved into docker-publish.yml |

### PR Job Sequence (docker-publish.yml)

```
pull_request → main (same-repo only)
  ↓
build-and-push (matrix: amd64 + arm64)   fail-fast=true
  │  build only — validates Dockerfile compiles cleanly (no push)
  ↓ both must succeed
pre-merge-cd-check
  ├── build + push :pr-{n}-amd64 and :pr-{n}-arm64 to GHCR
  ├── verify both PR arch images exist in registry
  ├── create + verify test manifest :pr-{n}
  ├── assert version not already tagged in registry
  └── clean up all :pr-{n}-* images (always, even on failure)
```

### Post-merge Job Sequence (docker-publish.yml)

```
push to main
  ↓
build-and-push (matrix: amd64 + arm64)   fail-fast=true
  ↓ both must succeed
verify — inspect both digests in GHCR
  ↓ either missing → cleanup job runs, workflow fails
merge
  ├── read version from packages/stdio/package.json
  ├── assert version tag not already in registry
  ├── create multi-arch manifest (:latest, :2.5.0, :2.5, :2)
  ├── verify manifest is pullable
  ├── create git tag (idempotent)
  └── delete staging tags (:latest-amd64, :latest-arm64) via GHCR REST API
  ↓ any step fails → cleanup job runs
cleanup (runs on verify or merge failure)
  └── delete :latest-amd64 and :latest-arm64 from GHCR via REST API
```

### Required GitHub Branch Protection Rules

These settings **must** be configured in GitHub → Settings → Branches → main to enforce the PR gate. They cannot be set in workflow files.

- **Require status checks to pass before merging**
  - Required checks: `test` (functional-tests.yml), `build-and-push` (docker-publish.yml), and `pre-merge-cd-check` (docker-publish.yml)
- **Require branches to be up to date before merging** — enabled
- **Restrict who can push to matching branches** — block direct pushes to main
- **Do not allow bypassing the above settings** — enabled

Without these rules, GitHub will allow the merge button regardless of workflow results.

> **Note:** `pre-merge-cd-check` only runs on same-repo PRs (not forks). Fork PRs cannot push to GHCR and will not have this check required.

### Version Tagging Convention

- Version is always read from `packages/stdio/package.json` (the published package).
- The root `package.json` is `private: true` and is **not** the version source.
- Bumping `packages/stdio/package.json` version and merging to main triggers a full release.
- If the version tag already exists in GHCR, the pipeline fails early to prevent overwriting a released image.
- Git tag (`vX.Y.Z`) is created **after** the registry manifest is verified — never before.

## Future Plans

- [ ] Publish to NPM as `bookstack-mcp`
- [ ] Deploy to Smithery.ai at `bookstack-mcp.webmodule.org`
- [ ] Add streamable-http transport for remote hosting
- [ ] Support for BookStack webhooks
- [ ] Caching layer for frequently accessed content
- [ ] Rate limiting for API calls
