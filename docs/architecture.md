# BookStack MCP — Architecture

## Overview

BookStack MCP Server is a monorepo with two packages:

- **`packages/core`** (`@bookstack-mcp/core`) — BookStack API client and shared types. Uses native `fetch` only (no axios). No runtime dependencies.
- **`packages/stdio`** (`bookstack-mcp-stdio`) — MCP server with stdio transport. Imports `BookStackClient` and `BookStackConfig` from `@bookstack-mcp/core`.

## Repository structure

```
packages/
├── core/                       # @bookstack-mcp/core — shared client & types
│   ├── src/
│   │   ├── bookstack-client.ts # BookStack API client (native fetch)
│   │   └── types.ts            # Shared TypeScript types
│   ├── tests/                  # Unit, fuzz, and functional tests
│   └── dist/                   # Compiled output
└── stdio/                      # bookstack-mcp-stdio — MCP server
    ├── src/
    │   └── index.ts            # MCP tools + stdio transport
    └── dist/
        └── index.js            # Entry point (npm start / Docker)
```

## Data flow

```
MCP Client (Claude Desktop / LibreChat)
  │  stdio: tool list request / tool call
  ▼
packages/stdio — McpServer
  │  Zod input validation → registered tool handler
  ▼
packages/core — BookStackClient (native fetch)
  │  HTTPS + Token auth → BookStack REST API
  ▼
BookStack instance
  │  JSON response
  ▼
BookStackClient — response enhancement (URLs, previews, dates, word counts)
  ▼
packages/stdio — JSON serialised as MCP tool result
  ▼
MCP Client
```

## Actors

| Actor | Role |
|---|---|
| **MCP Client** (Claude Desktop, LibreChat, etc.) | Sends tool-call requests over stdio; receives structured JSON responses |
| **bookstack-mcp server** (`packages/stdio`) | Validates inputs with Zod, dispatches to the BookStack API client, formats responses |
| **BookStack API client** (`packages/core`) | Authenticates with the BookStack instance, makes HTTP requests, enhances responses |
| **BookStack instance** | Stores and serves documentation content via its REST API |
| **Operator** | Configures environment variables (`BOOKSTACK_BASE_URL`, tokens, `BOOKSTACK_ENABLE_WRITE`) |

## Key design decisions

- **Native fetch** — no axios; HTTP errors surface as `error.status` / `error.response`
- **Stdio transport** — single universal transport for local, LibreChat, and Claude Desktop use
- **Zod schemas** — all MCP tool inputs validated before the API is called
- **Write-gate** — write tools are only registered when `BOOKSTACK_ENABLE_WRITE=true`
- **Monorepo** — `packages/core` has no runtime dependencies; `packages/stdio` depends on core and the MCP SDK

## Core components

### `packages/core/src/bookstack-client.ts`

Fetch-based HTTP client with:
- Token authentication via `Authorization: Token {id}:{secret}` header
- 30-second default timeout (120s for file uploads)
- 429 rate-limit retry — 3 retries, honours `Retry-After` header, defaults to 10s backoff
- `request<T>(method, path, params?, body?, options?)` — core HTTP method
- `requestForm<T>(path, formData, options?)` — FormData POST for file uploads
- Private enhancement methods that augment API responses before they are returned:
  - `enhanceBookResponse()` — adds URL, direct_link, friendly dates, content preview
  - `enhancePageResponse()` — adds URL, direct_link, word_count, content preview, location
  - `enhanceChapterResponse()` — adds URL, direct_link, friendly dates, location
  - `enhanceShelfResponse()` — adds URL, direct_link, book_count, tags_summary
  - `enhanceSearchResults()` — adds URL, direct_link, content_preview, location_info

### `packages/core/src/types.ts`

Shared TypeScript interfaces:

| Type | Description |
|---|---|
| `BookStackConfig` | `{baseUrl, tokenId, tokenSecret, enableWrite?}` |
| `Book` | id, name, slug, description, timestamps, owned_by |
| `Page` | id, book_id, chapter_id?, name, slug, html, markdown, text, timestamps |
| `Chapter` | id, book_id, name, slug, description, timestamps |
| `Shelf` | id, name, slug, description, books[], tags[], timestamps |
| `Attachment` | id, name, extension, uploaded_to, external, timestamps |
| `Comment` | id, commentable_id, html, local_id, parent_id, archived, replies?, timestamps |
| `SearchResult` | type, id, name, slug, preview_content?, timestamps |
| `ListResponse<T>` | `{data: T[], total: number}` |
| `AuditLogEntry` | id, type, detail, user_id, loggable_*, ip, created_at |
| `SystemInfo` | version, instance_id, app_name, base_url |
| `User` | id, name, email, slug, profile_url, timestamps |
| `RecycleBinEntry` | id, deleted_by, deletable_type, deletable_id, deletable |
| `ImageGalleryEntry` | id, name, url, path, type, uploaded_to, timestamps |
| `ApiError` | extends Error with `status?` and `response?` |

### `packages/stdio/src/index.ts`

MCP server entry point:
- Reads and validates environment variables at startup; exits with a clear error message if required vars are missing or `BOOKSTACK_BASE_URL` is not HTTPS
- Creates a `BookStackClient` instance
- Registers read tools unconditionally (26 tools)
- Registers write tools inside `if (config.enableWrite)` (19 tools)
- Starts the stdio transport

## Response enhancement

All API responses are enhanced with additional fields before being returned to the MCP client. The enrichment adds human-friendly context that raw BookStack API responses do not include:

| Field | Description |
|---|---|
| `url` | Full URL to the item in BookStack, using slugs where available (`{baseUrl}/books/{slug}/page/{slug}`) |
| `direct_link` | Markdown-formatted link: `[Name](url)` |
| `friendly_date` | Relative timestamp ("2 hours ago", "3 days ago") |
| `content_preview` | 150–200 character excerpt of text content |
| `word_count` | Word count (pages only) |
| `location` | Parent book name and chapter name (pages and chapters) |

## URL generation

All URLs use slugs instead of IDs where available:
- Format: `{baseUrl}/books/{book.slug}/page/{page.slug}`
- Falls back to ID-based URLs if slugs are unavailable

## Export handling

Binary formats (PDF, ZIP) cannot be returned as inline content, so the server returns a metadata object containing a direct download URL:

```json
{
  "download_url": "https://bookstack.example.com/...",
  "page_name": "API Guide",
  "book_name": "Developer Docs",
  "filename": "api-guide.pdf",
  "note": "Click download_url to retrieve the file"
}
```

Text formats (`html`, `markdown`, `plaintext`) return the raw content string directly.

## Write operation security

Write tools are only registered when `BOOKSTACK_ENABLE_WRITE=true` is explicitly set:

```typescript
if (config.enableWrite) {
  server.registerTool("create_page", ...);
  server.registerTool("update_page", ...);
  // ... other write tools
}
```

If a write tool is called without the flag set, the client receives a clear error message. Write operations are disabled by default; the server exposes only read tools in the default configuration.

## HTTPS enforcement

The server validates `BOOKSTACK_BASE_URL` at startup and exits immediately if it does not begin with `https://`. This prevents API tokens and content from being transmitted over plain HTTP.

## Dependency structure

| Package | Runtime deps | Dev deps |
|---|---|---|
| `packages/core` | none | typescript, vitest, fast-check, @fast-check/vitest |
| `packages/stdio` | @bookstack-mcp/core, @modelcontextprotocol/sdk, zod | typescript, tsx, @types/node |

## Migration history

### v1.0 → v2.0

| Before | After |
|---|---|
| Multiple entry files | Single `src/index.ts` |
| Manual MCP protocol handlers | `McpServer` + `registerTool()` API |
| SSE transport + supergateway | Stdio only |
| Separate transport layer | Universal transport |
| No input validation | Zod schemas on all inputs |
| Complex Docker setup for LibreChat | Add to `librechat.yaml` and restart |

### v2.0 → v2.5.0 Monorepo

- Root `src/` removed; split into `packages/core` and `packages/stdio`
- `packages/core` has zero runtime dependencies (native `fetch` only, no axios)
- Tests moved to `packages/core/tests`
- Docker and CI build from repo root; image runs `node packages/stdio/dist/index.js`
- Version source is `packages/stdio/package.json` (root `package.json` is `private: true`)
