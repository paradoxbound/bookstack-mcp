# BookStack MCP Server

[![OpenSSF Baseline](https://www.bestpractices.dev/projects/12116/baseline)](https://www.bestpractices.dev/projects/12116)

BookStack stores your team's knowledge — but AI assistants can't access it without an integration. BookStack MCP Server bridges that gap, connecting AI assistants (Claude Desktop, LibreChat, and any MCP-compatible client) directly to your BookStack instance so they can search, read, and manage your documentation through natural language.

## Obtaining the software

- **Docker (recommended):** `docker pull ghcr.io/paradoxbound/bookstack-mcp:latest`
- **npm:** `npx bookstack-mcp` (no installation required)
- **Source:** Clone the repository and run `npm install && npm run build`

Full setup instructions are in the [Quick Start](#quick-start) section below.

## Feedback and contributing

- **Bug reports and feature requests:** [Open an issue](https://github.com/paradoxbound/bookstack-mcp/issues)
- **Security vulnerabilities:** Follow the process in [SECURITY.md](SECURITY.md) — do not open a public issue
- **Contributing code or docs:** See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution process, DCO sign-off requirement, and code style requirements

## Features

- **Modern MCP Implementation** - Uses latest `McpServer` with `registerTool()` API
- **Full BookStack API Integration** - Search, read, create, and update content
- **Embedded URLs** - All responses include clickable links to BookStack pages
- **Multiple Deployment Options** - Docker, stdio, or LibreChat
- **Comprehensive Tools** - 45 tools for BookStack operations
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
git clone https://github.com/paradoxbound/bookstack-mcp.git
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
      "args": ["/path/to/bookstack-mcp/packages/stdio/dist/index.js"],
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
      - /path/to/bookstack-mcp/packages/stdio/dist/index.js
    env:
      BOOKSTACK_BASE_URL: "https://your-bookstack.com"
      BOOKSTACK_TOKEN_ID: "your-token-id"
      BOOKSTACK_TOKEN_SECRET: "your-token-secret"
```

### Docker

```bash
docker pull ghcr.io/paradoxbound/bookstack-mcp:latest
```

Run with environment variables:

```bash
docker run --rm \
  -e BOOKSTACK_BASE_URL=https://your-bookstack.com \
  -e BOOKSTACK_TOKEN_ID=your-token-id \
  -e BOOKSTACK_TOKEN_SECRET=your-token-secret \
  ghcr.io/paradoxbound/bookstack-mcp:latest
```

To enable write operations:

```bash
docker run --rm \
  -e BOOKSTACK_BASE_URL=https://your-bookstack.com \
  -e BOOKSTACK_TOKEN_ID=your-token-id \
  -e BOOKSTACK_TOKEN_SECRET=your-token-secret \
  -e BOOKSTACK_ENABLE_WRITE=true \
  ghcr.io/paradoxbound/bookstack-mcp:latest
```

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
18. **get_comments** - List comments with optional page filtering
19. **get_comment** - Get comment details including replies
20. **get_audit_log** - List audit log (system activity trail)
21. **get_system_info** - BookStack version and instance info
22. **get_users** - List users (read-only)
23. **get_user** - Get user details (read-only)
24. **get_recycle_bin** - List soft-deleted items
25. **get_image_gallery** - List gallery images (read-only)
26. **get_image** - Get gallery image details (read-only)

### Write Operations (Requires BOOKSTACK_ENABLE_WRITE=true)

27. **create_book** - Create new books
28. **update_book** - Update existing books
29. **delete_book** - Delete books
30. **create_chapter** - Create new chapters
31. **update_chapter** - Update existing chapters
32. **delete_chapter** - Delete chapters
33. **create_page** - Create new pages
34. **update_page** - Update existing pages
35. **delete_page** - Delete pages
36. **create_shelf** - Create new shelves
37. **update_shelf** - Update existing shelves
38. **delete_shelf** - Delete shelves
39. **create_attachment** - Create link attachments
40. **upload_attachment** - Upload file attachments from local filesystem
41. **update_attachment** - Update attachments
42. **delete_attachment** - Delete attachments
43. **create_comment** - Create comments on pages (with reply support)
44. **update_comment** - Update comment content or archive status
45. **delete_comment** - Delete comments

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

# Run functional tests (requires TEST_BOOKSTACK_* env vars)
npm test
```

### Testing

Tests run automatically on every pull request and every push to `main` via the [Functional Tests](https://github.com/paradoxbound/bookstack-mcp/actions/workflows/functional-tests.yml) GitHub Actions workflow. The workflow also runs `npm audit`, OSV dependency scanning, and a TypeScript type-check on every run.

To run tests locally, provide credentials for a live BookStack instance:

```env
TEST_BOOKSTACK_URL=https://your-test-bookstack.com
TEST_BOOKSTACK_TOKEN_ID=your-test-token-id
TEST_BOOKSTACK_TOKEN_SECRET=your-test-token-secret
```

Tests are self-seeding: they create all required data on the instance and clean up afterward. The test instance can start empty. Tests skip gracefully when credentials are not configured.

## Project Structure

```
packages/
├── core/                 # @bookstack-mcp/core – shared client & types
│   ├── src/
│   │   ├── bookstack-client.ts   # BookStack API (native fetch)
│   │   └── types.ts             # Shared types
│   ├── tests/                  # Functional tests
│   └── dist/
└── stdio/                # bookstack-mcp-stdio – MCP server
    ├── src/
    │   └── index.ts            # MCP tools + stdio transport
    └── dist/
        └── index.js            # Entry point (npm start / Docker)
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

### Actors

| Actor | Role |
|-------|------|
| **MCP Client** (Claude Desktop, LibreChat, etc.) | Sends tool-call requests over stdio; receives structured JSON responses |
| **bookstack-mcp server** (`packages/stdio`) | Validates inputs with Zod, dispatches to the BookStack API client, formats responses |
| **BookStack API client** (`packages/core`) | Authenticates with the BookStack instance, makes HTTP requests, enhances responses |
| **BookStack instance** | Stores and serves documentation content via its REST API |
| **Operator** | Configures environment variables (`BOOKSTACK_BASE_URL`, tokens, `BOOKSTACK_ENABLE_WRITE`) |

### Data flow

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

### Key design decisions

- **Native fetch** — no axios; HTTP errors surface as `error.status` / `error.response`
- **Stdio transport** — single universal transport for local, LibreChat, and Claude Desktop use
- **Zod schemas** — all MCP tool inputs validated before the API is called
- **Write-gate** — write tools are only registered when `BOOKSTACK_ENABLE_WRITE=true`
- **Monorepo** — `packages/core` has no runtime dependencies; `packages/stdio` depends on core and the MCP SDK

## Dependency Management

Dependencies are declared in `packages/core/package.json` and `packages/stdio/package.json` and locked in `package-lock.json` at the repository root. All installs use `npm ci` to ensure exact, reproducible versions from the lock file.

**Tracking and updates:**
- [Dependabot](https://github.com/paradoxbound/bookstack-mcp/blob/main/.github/dependabot.yml) automatically opens pull requests for outdated npm packages, GitHub Actions, and the Docker base image on a weekly schedule
- `npm audit` runs on every CI build and fails on high or critical severity vulnerabilities
- [OSV Scanner](https://github.com/google/osv-scanner) and [Trivy](https://github.com/aquasecurity/trivy) scan for known CVEs in both npm dependencies and the Docker image on every build
- The Docker runtime image runs `apk upgrade --no-cache` at build time to apply the latest Alpine OS package patches regardless of the pinned base image digest

## Verifying releases

Every Docker image published to GHCR has a [SLSA Level 2 provenance attestation](https://slsa.dev/) generated by GitHub Actions. You can verify that an image was built from this repository's official pipeline using the GitHub CLI:

```bash
gh attestation verify \
  oci://ghcr.io/paradoxbound/bookstack-mcp:2.6.1 \
  --owner paradoxbound
```

A successful verification confirms:
- The image was built by a GitHub Actions workflow in this repository
- The exact source commit that produced it
- It has not been tampered with after publication

To verify a specific digest rather than a tag:

```bash
# Get the digest first
docker pull ghcr.io/paradoxbound/bookstack-mcp:2.6.1
docker inspect ghcr.io/paradoxbound/bookstack-mcp:2.6.1 --format '{{index .RepoDigests 0}}'

# Verify by digest
gh attestation verify \
  oci://ghcr.io/paradoxbound/bookstack-mcp@sha256:<digest> \
  --owner paradoxbound
```

Source releases are signed git tags — you can verify the tag signature with:

```bash
git tag --verify v2.6.1
```

### Software Bill of Materials (SBOM)

Every Docker image release includes an SBOM in SPDX JSON format, attached as an asset to the [GitHub Release](https://github.com/paradoxbound/bookstack-mcp/releases). Download it from the release page:

```bash
gh release download v2.6.1 --pattern 'sbom.spdx.json'
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on making changes, running tests, and the DCO sign-off requirement.

## License

This project is released under the [MIT License](LICENSE) (SPDX: `MIT`), an [OSI-approved](https://opensource.org/license/mit) permissive free and open-source software license.

## Links

- **Repository**: https://github.com/paradoxbound/bookstack-mcp
- **BookStack**: https://www.bookstackapp.com
- **MCP**: https://modelcontextprotocol.io
- **LibreChat**: https://www.librechat.ai
