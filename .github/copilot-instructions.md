# BookStack MCP Server - AI Coding Agent Instructions

## Project Overview
BookStack MCP v2.5.0 is a **monorepo** providing a Model Context Protocol server for BookStack. Architecture: `packages/core` (shared API client + types) and `packages/stdio` (MCP server with stdio transport). The core design uses **native `fetch` only** (no axios) and `McpServer` + `registerTool()` for clean, maintainable code.

## Monorepo Structure
```
packages/core/          # @bookstack-mcp/core - BookStack API client
  src/
    bookstack-client.ts # HTTP client, all API methods, response enhancement
    types.ts            # Shared TypeScript types
  tests/                # Functional tests with vitest

packages/stdio/         # bookstack-mcp-stdio - MCP server
  src/
    index.ts           # Entry point: env validation, tool registration, stdio transport
```

**Key Design**: Core is a dependency of stdio. Tests import from `@bookstack-mcp/core`. Root commands (`npm run build`, `npm test`) delegate to workspaces.

## Critical Patterns

### Error Handling: Native Fetch (No Axios)
All HTTP requests use native `fetch`. On error, set `error.status` and `error.response`:

```typescript
// packages/core/src/bookstack-client.ts - request() method
if (!res.ok) {
  const text = await res.text();
  const err = new Error(message) as Error & {
    status?: number;
    response?: { status: number; data: string };
  };
  err.status = res.status;
  err.response = { status: res.status, data: text };
  throw err;
}
```

Tool handlers in `packages/stdio/src/index.ts` check `error.status`:
```typescript
function sanitizeError(error: unknown): string {
  const err = error as { status?: number; response?: { status: number; data: string }; message?: string } | null;
  if (err && typeof err === 'object' && typeof err.status === 'number') {
    const status = err.status;
    if (status === 401 || status === 403) return 'Authentication or permission error...';
    if (status === 404) return 'The requested content was not found...';
    // ...
  }
}
```

**Never reference `err.response.status` from axios** - use `err.status` directly.

### Tool Registration Pattern
Use `McpServer.registerTool()` with Zod schemas. All tools wrapped in `toolHandler()` for consistent error handling:

```typescript
// packages/stdio/src/index.ts
server.registerTool(
  "get_page",
  {
    title: "Get Page Content",
    description: "Get full content of a specific page",
    inputSchema: {
      id: z.number().int().min(1).describe("Page ID")
    }
  },
  toolHandler(async (args) => {
    const page = await client.getPage(args.id);
    return {
      content: [{ type: "text", text: JSON.stringify(page, null, 2) }]
    };
  })
);
```

### Write Operations Security
Write tools only registered when `BOOKSTACK_ENABLE_WRITE=true`:

```typescript
if (config.enableWrite) {
  server.registerTool("create_page", ...);
  server.registerTool("update_page", ...);
}
```

**Always check** `this.enableWrite` in BookStackClient before executing write methods.

### Response Enhancement
All API responses are enhanced in `packages/core/src/bookstack-client.ts`:
- Add direct URLs using slugs: `${baseUrl}/books/${book.slug}/page/${page.slug}`
- Add markdown links, content previews (150-200 chars), word counts
- Convert timestamps to human-friendly dates
- Include contextual location info (book/chapter hierarchy)

Private methods: `enhanceBookResponse()`, `enhancePageResponse()`, `enhanceChapterResponse()`, `enhanceSearchResults()`.

### URL Generation Strategy
- **Prefer slugs over IDs**: URLs use `book.slug` and `page.slug` when available
- **Maintain caches**: `bookSlugCache` and `pageInfoCache` avoid redundant API calls
- **Fallback**: If slug unavailable, use ID

## Development Workflows

### Build & Run
```bash
npm install              # Install all workspace dependencies
npm run build           # Compile TypeScript in all packages
npm run type-check      # Type-check without emitting
npm run dev             # Hot reload (tsx on packages/stdio)
npm start               # Run production build
```

### Testing
```bash
npm test                # Run packages/core tests with vitest
```

**Requirements**: Tests need environment variables:
- `TEST_BOOKSTACK_URL`
- `TEST_BOOKSTACK_TOKEN_ID`
- `TEST_BOOKSTACK_TOKEN_SECRET`

Tests use `global-setup.ts` to seed data, `global-teardown.ts` to clean up. Sequential execution via vitest config. Helpers in `packages/core/tests/helpers.ts` provide `createWriteClient()`, `loadSeedData()`, etc.

### Adding a New Tool
1. Add method to `BookStackClient` in `packages/core/src/bookstack-client.ts` if needed
2. Register tool in `packages/stdio/src/index.ts` using `server.registerTool()`
3. If write operation, add inside `if (config.enableWrite) { ... }` block
4. Use `toolHandler()` wrapper for consistent error handling

### Modifying Enhancement Logic
Edit private methods in `packages/core/src/bookstack-client.ts`:
- `enhanceBookResponse()` - Add URLs, previews to books
- `enhancePageResponse()` - Add URLs, word counts, previews to pages
- `enhanceChapterResponse()` - Add URLs to chapters
- `enhanceSearchResults()` - Add URLs, previews to search results

## Configuration

### Environment Variables (Required)
```bash
BOOKSTACK_BASE_URL=https://your-bookstack.com
BOOKSTACK_TOKEN_ID=your-token-id
BOOKSTACK_TOKEN_SECRET=your-token-secret
BOOKSTACK_ENABLE_WRITE=false  # Optional, defaults to false
```

Validated in `packages/stdio/src/index.ts`:
- `getRequiredEnvVar()` - Exits if missing
- `validateBaseUrl()` - Checks URL format and scheme

### TypeScript Configuration
- Target: ES2022 with ESNext modules
- Module resolution: Bundler (for workspace imports)
- Strict mode: disabled (historical)
- Output: `dist/` in each package

## Deployment Options

### Claude Desktop
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
```

## Common Gotchas

1. **Axios references**: This codebase uses native `fetch`, not axios. Error properties are `error.status` and `error.response`, not `error.response.status`.

2. **Workspace imports**: Use `@bookstack-mcp/core` to import from core package. TypeScript resolves via `exports` in `packages/core/package.json`.

3. **Stdio logging**: Use `console.error()` for logs (goes to stderr). Never use `console.log()` in `packages/stdio/src/index.ts` - it breaks stdio protocol.

4. **Write operations**: Always gate behind `config.enableWrite` check. Default is `false` for security.

5. **Response format**: All tool handlers return `{ content: [{ type: "text", text: string }] }`. Use `JSON.stringify(result, null, 2)` for readability.

6. **URL construction**: Always use slug-based URLs when available. Fallback to ID-based URLs. Never hardcode paths.

## Reference Files

- [packages/core/src/bookstack-client.ts](packages/core/src/bookstack-client.ts) - HTTP client, API methods, enhancement logic
- [packages/stdio/src/index.ts](packages/stdio/src/index.ts) - Tool registration, error handling
- [packages/core/src/types.ts](packages/core/src/types.ts) - Shared TypeScript types
- [packages/core/tests/helpers.ts](packages/core/tests/helpers.ts) - Test utilities
- [CLAUDE.md](CLAUDE.md) - Extended project documentation
