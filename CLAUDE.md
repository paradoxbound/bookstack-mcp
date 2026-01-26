# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BookStack MCP (Model Context Protocol) Server v2.0 - A modern TypeScript MCP server providing BookStack integration for AI assistants. Uses the latest McpServer API with registerTool() for clean, maintainable code.

## Build & Development Commands

### Build
```bash
npm install              # Install dependencies (includes zod)
npm run build           # Compile TypeScript to dist/
npm run type-check      # Type-check without emitting files
```

### Development
```bash
npm run dev             # Start server with hot reload (tsx)
```

### Production
```bash
npm start               # Run compiled server (node dist/index.js)
```

## Architecture

### Modern MCP Design (v2.0)

This is a **single-file MCP server** using modern patterns:

**`src/index.ts`** - Complete MCP server implementation
- Uses `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js` (modern API)
- Each tool registered with `server.registerTool()` method
- Zod schemas for type-safe input validation
- Stdio transport for universal compatibility
- Write tools conditionally registered based on `BOOKSTACK_ENABLE_WRITE`

**Key Design Decisions:**
- **No separate transport layer** - Stdio works for all use cases (local, LibreChat, Claude Desktop)
- **No SSE complexity** - Removed; stdio is the standard
- **No manual request handlers** - `registerTool()` handles everything
- **No separate tools file** - All logic in single entry point
- **Type-safe schemas** - Zod for input validation, TypeScript for type safety

### Data Flow

```
MCP Client (LibreChat/Claude Desktop/Smithery)
  ↓
Stdio Transport (universal)
  ↓
McpServer - automatically handles ListTools/CallTool requests
  ↓
Tool handler functions - call BookStackClient methods
  ↓
BookStackClient - makes BookStack API calls, enhances responses
  ↓
Return enhanced JSON with URLs, previews, metadata
```

### Core Components

**`src/index.ts`** - Main server (640 lines)
- Environment variable validation
- McpServer instantiation
- Tool registration (17 read-only + 8 write tools)
- Stdio transport connection
- All in one clean file

**`src/bookstack-client.ts`** - BookStack API wrapper (747 lines)
- Axios-based HTTP client with token authentication
- Type-safe interfaces for BookStack entities
- **Response enhancement layer** adds:
  - Direct URLs using slugs
  - Markdown-formatted links
  - Human-friendly dates ("2 hours ago")
  - Content previews (150-200 chars)
  - Contextual metadata
- Export handling (binary vs text formats)
- Write operations gated by `enableWrite` flag

**Deprecated Files:**
- `src/stdio.ts` - Old low-level API implementation (not needed)
- `src/sse-transport.ts` - Old SSE server (not needed)
- `src/bookstack-tools.ts` - Old manual handlers (not needed)

These can be deleted in future cleanup.

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
      "args": ["/path/to/dist/index.js"],
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

1. Add method to `BookStackClient` if needed (src/bookstack-client.ts)
2. Register tool in `src/index.ts` using `server.registerTool()`:
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

Edit private enhancement methods in `BookStackClient`:
- `enhanceBookResponse()` at line ~139
- `enhancePageResponse()` at line ~154
- `enhanceChapterResponse()` at line ~172
- `enhanceShelfResponse()` at line ~188
- `enhanceSearchResults()` at line ~207

All enhancement logic is centralized in the client layer.

### Testing Changes

```bash
# Type check
npm run type-check

# Run in development
npm run dev

# Build and test
npm run build
node dist/index.js

# Test with LibreChat
# Add to librechat.yaml and restart LibreChat
```

## Dependencies

- **@modelcontextprotocol/sdk** (^0.5.0) - Core MCP protocol
- **axios** (^1.6.0) - BookStack API client
- **zod** (^3.22.0) - Schema validation for tool inputs
- **tsx** (^4.6.0) - Development hot reload
- **typescript** (^5.3.0) - Type-safe development

## Migration from v1.0

### What Changed

1. **Single entry point** - `src/index.ts` replaces multiple files
2. **Modern API** - `McpServer` + `registerTool()` instead of manual handlers
3. **Removed complexity** - No SSE, no supergateway, no separate transport layer
4. **Stdio only** - Universal transport works everywhere
5. **Zod schemas** - Type-safe input validation
6. **Simpler deployment** - Just works with LibreChat, Claude Desktop, Smithery

### Breaking Changes

- Removed SSE transport (`src/sse-transport.ts`)
- Removed old stdio implementation (`src/stdio.ts`)
- Removed tools abstraction (`src/bookstack-tools.ts`)
- Removed Express dependency
- Removed Docker compose configs (simpler deployment)

### Benefits

- **90% less code** - From ~2000 lines to ~640 in main file
- **Easier to maintain** - All logic in one place
- **Modern patterns** - Uses latest MCP SDK features
- **Better types** - Zod validation at runtime
- **Universal compatibility** - Works with all MCP clients

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

## Future Plans

- [ ] Publish to NPM as `bookstack-mcp`
- [ ] Deploy to Smithery.ai at `bookstack-mcp.webmodule.org`
- [ ] Add streamable-http transport for remote hosting
- [ ] Support for BookStack webhooks
- [ ] Caching layer for frequently accessed content
- [ ] Rate limiting for API calls
