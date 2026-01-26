# BookStack MCP Server

A modern Model Context Protocol (MCP) server for BookStack, providing AI assistants with full access to your BookStack documentation.

## Features

- **Modern MCP Implementation** - Uses latest `McpServer` with `registerTool()` API
- **Full BookStack API Integration** - Search, read, create, and update content
- **Embedded URLs** - All responses include clickable links to BookStack pages
- **Multiple Deployment Options** - Local (stdio), LibreChat, or hosted (Smithery.ai)
- **Comprehensive Tools** - 17+ tools for BookStack operations
- **Type-Safe** - Full TypeScript with Zod schemas
- **Security** - Write operations disabled by default

## Quick Start

### Prerequisites

- Node.js 18+
- BookStack instance with API access
- BookStack API token (Token ID and Secret)

### Installation

```bash
# Clone repository
git clone https://github.com/ttpears/bookstack-mcp.git
cd bookstack-mcp

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your BookStack credentials

# Build
npm run build

# Run
npm start
```

### Environment Variables

Create a `.env` file:

```env
# Required
BOOKSTACK_BASE_URL=https://your-bookstack.com
BOOKSTACK_TOKEN_ID=your-token-id
BOOKSTACK_TOKEN_SECRET=your-token-secret

# Optional
BOOKSTACK_ENABLE_WRITE=false  # Set to 'true' to enable write operations
```

## Usage

### Local Use (Claude Desktop)

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "bookstack": {
      "command": "node",
      "args": ["/path/to/bookstack-mcp/dist/index.js"],
      "env": {
        "BOOKSTACK_BASE_URL": "https://your-bookstack.com",
        "BOOKSTACK_TOKEN_ID": "your-token-id",
        "BOOKSTACK_TOKEN_SECRET": "your-token-secret"
      }
    }
  }
}
```

### LibreChat Integration

Add to your `librechat.yaml`:

```yaml
mcpServers:
  bookstack:
    command: npx
    args:
      - -y
      - bookstack-mcp
    env:
      BOOKSTACK_BASE_URL: "https://your-bookstack.com"
      BOOKSTACK_TOKEN_ID: "your-token-id"
      BOOKSTACK_TOKEN_SECRET: "your-token-secret"
      # BOOKSTACK_ENABLE_WRITE: "false"  # Optional
```

Or use local build:

```yaml
mcpServers:
  bookstack:
    command: node
    args:
      - /path/to/bookstack-mcp/dist/index.js
    env:
      BOOKSTACK_BASE_URL: "https://your-bookstack.com"
      BOOKSTACK_TOKEN_ID: "your-token-id"
      BOOKSTACK_TOKEN_SECRET: "your-token-secret"
```

### NPM Package (Coming Soon)

```bash
npx bookstack-mcp
```

### Remote Deployment (Smithery.ai)

Coming soon: `bookstack-mcp.webmodule.org`

## Available Tools

### Read Operations (Always Available)

1. **get_capabilities** - Show current server capabilities
2. **search_content** - Advanced search with filtering and pagination
3. **search_pages** - Search specifically for pages with book filtering
4. **get_books** - List books with advanced filtering and sorting
5. **get_book** - Get detailed information about a specific book
6. **get_pages** - List pages with previews and context
7. **get_page** - Get full content of a specific page
8. **get_chapters** - List chapters with filtering
9. **get_chapter** - Get details of a specific chapter
10. **get_shelves** - List book shelves (collections)
11. **get_shelf** - Get shelf details with all books
12. **get_attachments** - List attachments with filtering
13. **get_attachment** - Get attachment details
14. **export_page** - Export pages in various formats
15. **export_book** - Export entire books
16. **export_chapter** - Export chapters
17. **get_recent_changes** - Get recently updated content

### Write Operations (Requires BOOKSTACK_ENABLE_WRITE=true)

18. **create_page** - Create new pages
19. **update_page** - Update existing pages
20. **create_shelf** - Create new shelves
21. **update_shelf** - Update existing shelves
22. **delete_shelf** - Delete shelves
23. **create_attachment** - Create link attachments
24. **update_attachment** - Update attachments
25. **delete_attachment** - Delete attachments

## BookStack API Setup

1. Log into your BookStack instance as an admin
2. Go to Settings → Users → Edit your user
3. Ensure the user has "Access System API" permission
4. Navigate to the "API Tokens" section
5. Create a new API token
6. Copy the Token ID and Token Secret to your `.env` file

## Security Considerations

- **Write operations are disabled by default** for safety
- Only enable writes if you trust the AI with your BookStack content
- Use HTTPS for production BookStack instances
- Store API tokens securely (never commit to git)
- Consider using a dedicated BookStack user with limited permissions
- Regular token rotation recommended

## Development

```bash
# Development with hot reload
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build
```

## Project Structure

```
src/
├── index.ts              # Main server entry (MCP implementation)
├── bookstack-client.ts   # BookStack API wrapper
└── bookstack-tools.ts    # Legacy (no longer used)

dist/                     # Compiled JavaScript output
```

## Response Enhancements

All responses include:
- **Direct URLs** - Clickable links to BookStack pages
- **Content Previews** - 150-200 character excerpts
- **Human-Friendly Dates** - "2 hours ago" instead of timestamps
- **Contextual Info** - Book/chapter locations, word counts
- **Rich Metadata** - Creation dates, update history

## Troubleshooting

### Connection Issues

```bash
# Test BookStack API access
curl -H "Authorization: Token YOUR_TOKEN_ID:YOUR_TOKEN_SECRET" \
  https://your-bookstack.com/api/docs
```

### LibreChat Issues

1. **Server not starting** - Check environment variables in `librechat.yaml`
2. **Permission errors** - Verify BookStack API user has correct permissions
3. **Tools not appearing** - Restart LibreChat after config changes

### Debug Mode

Check logs for error messages:
- LibreChat: `docker compose logs -f api`
- Local: Errors go to stderr

## Architecture

Built with modern MCP patterns:
- `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js`
- `registerTool()` API with Zod schemas
- Stdio transport for local/LibreChat use
- Single entry point (`src/index.ts`)
- Type-safe with TypeScript 5.3+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with LibreChat and Claude Desktop
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Links

- **Repository**: https://github.com/ttpears/bookstack-mcp
- **BookStack**: https://www.bookstackapp.com
- **MCP**: https://modelcontextprotocol.io
- **LibreChat**: https://www.librechat.ai
- **Smithery**: https://smithery.ai
