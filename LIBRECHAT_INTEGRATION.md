# LibreChat Integration Guide

Simple guide for integrating BookStack MCP server with LibreChat.

## Quick Setup

Add this to your `librechat.yaml`:

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
      # BOOKSTACK_ENABLE_WRITE: "false"  # Optional: Enable write operations
```

Restart LibreChat:
```bash
docker compose down && docker compose up -d
```

Done! The BookStack tools will be available in your chats.

## Alternative: Use Local Build

If you have cloned the repository locally:

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

## How It Works

1. **LibreChat spawns the process** - Runs `npx bookstack-mcp` with your environment variables
2. **Stdio communication** - LibreChat communicates with the MCP server via stdin/stdout
3. **Tools available** - All BookStack tools automatically appear in the chat interface
4. **No Docker config needed** - Everything runs within LibreChat's process space

## Security

- **Write operations disabled by default** - Set `BOOKSTACK_ENABLE_WRITE: "true"` to enable
- **Environment variables** - Credentials passed securely via env vars
- **No network exposure** - Server runs locally, no ports opened

## Verification

Check LibreChat logs:
```bash
docker compose logs -f api | grep -i mcp
```

You should see:
```
Initializing BookStack MCP Server...
BookStack URL: https://your-bookstack.com
Write operations: DISABLED
BookStack MCP server running on stdio
```

## Troubleshooting

### Tools Not Appearing

1. **Check YAML syntax** - Indentation matters
2. **Restart LibreChat** - Required after config changes
3. **Check logs** - Look for MCP initialization errors

### Permission Errors

1. **Verify BookStack API token** - Must have "Access System API" permission
2. **Test API access** - Try curl command from README
3. **Check BookStack URL** - Must be accessible from LibreChat container

### Connection Issues

```bash
# Check if MCP server can start
docker compose exec api npx -y bookstack-mcp

# Should show error about missing env vars (that's expected)
# If it shows "command not found", Node.js is not installed
```

## Advanced Configuration

### Custom Timeout

```yaml
mcpServers:
  bookstack:
    command: npx
    args: ["-y", "bookstack-mcp"]
    timeout: 30000  # 30 seconds (default)
    env:
      BOOKSTACK_BASE_URL: "https://..."
      BOOKSTACK_TOKEN_ID: "..."
      BOOKSTACK_TOKEN_SECRET: "..."
```

### Agent Builder Only

Hide from chat menu, only available in agent builder:

```yaml
mcpServers:
  bookstack:
    command: npx
    args: ["-y", "bookstack-mcp"]
    chatMenu: false  # Only in agent builder
    env:
      BOOKSTACK_BASE_URL: "https://..."
      # ... other env vars
```

### Custom Icon

```yaml
mcpServers:
  bookstack:
    command: npx
    args: ["-y", "bookstack-mcp"]
    iconPath: /path/to/custom/icon.svg
    env:
      # ... env vars
```

## What's Different from Old Integration?

**Old way (v1.0):**
- Required `Dockerfile.mcp-bookstack`
- Required `docker-compose.override.yml` changes
- Used supergateway to bridge stdio → SSE
- Complex Docker networking
- Separate service container

**New way (v2.0):**
- Just add to `librechat.yaml`
- No Docker changes needed
- Direct stdio communication
- Runs in LibreChat's process space
- Much simpler!

## Example Usage

Once configured, you can ask LibreChat:

- "Search BookStack for API documentation"
- "Show me all books in BookStack"
- "Get the contents of page 42"
- "What are the recent changes in BookStack?"
- "Export page 10 as markdown"

The AI will automatically use the BookStack MCP tools to answer your questions.

## Next Steps

- See [README.md](./README.md) for complete tool list
- Check [CLAUDE.md](./CLAUDE.md) for architecture details
- Visit [BookStack docs](https://www.bookstackapp.com/docs/) for API info
