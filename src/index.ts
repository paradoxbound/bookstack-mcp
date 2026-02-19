#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import { BookStackClient, BookStackConfig } from "./bookstack-client.js";

function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Error: ${name} environment variable is required`);
    process.exit(1);
  }
  return value;
}

function validateBaseUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    console.error(`Error: BOOKSTACK_BASE_URL is not a valid URL: ${raw}`);
    process.exit(1);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    console.error(`Error: BOOKSTACK_BASE_URL must use http or https scheme, got: ${parsed.protocol}`);
    process.exit(1);
  }

  return raw.replace(/\/+$/, '');
}

function sanitizeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const method = error.config?.method?.toUpperCase() ?? 'REQUEST';
    console.error(`BookStack API error: ${method} ${error.config?.url} → ${status}`);

    if (status === 401 || status === 403) return 'Authentication or permission error accessing BookStack.';
    if (status === 404) return 'The requested content was not found in BookStack.';
    if (status === 422) return `Validation error: ${error.response?.data?.message || 'invalid input.'}`;
    if (status === 429) return 'Rate limit exceeded. Please try again later.';
    if (status && status >= 500) return 'BookStack server error. Please try again later.';
    return 'BookStack request failed.';
  }
  if (error instanceof Error) {
    console.error(`Tool error: ${error.message}`);
    if (error.message.includes('Write operations are disabled')) return error.message;
    return 'An unexpected error occurred.';
  }
  console.error(`Unknown tool error: ${String(error)}`);
  return 'An unexpected error occurred.';
}

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

function toolHandler<T>(fn: (args: T) => Promise<ToolResult>) {
  return async (args: T): Promise<ToolResult> => {
    try {
      return await fn(args);
    } catch (error) {
      return {
        content: [{ type: "text", text: sanitizeError(error) }],
        isError: true
      };
    }
  };
}

async function main() {
  // Load configuration from environment
  const config: BookStackConfig = {
    baseUrl: validateBaseUrl(getRequiredEnvVar('BOOKSTACK_BASE_URL')),
    tokenId: getRequiredEnvVar('BOOKSTACK_TOKEN_ID'),
    tokenSecret: getRequiredEnvVar('BOOKSTACK_TOKEN_SECRET'),
    enableWrite: process.env.BOOKSTACK_ENABLE_WRITE?.toLowerCase() === 'true'
  };

  console.error('Initializing BookStack MCP Server...');
  console.error(`BookStack URL: ${config.baseUrl}`);
  console.error(`Write operations: ${config.enableWrite ? 'ENABLED' : 'DISABLED'}`);

  const client = new BookStackClient(config);
  const server = new McpServer({
    name: "bookstack-mcp",
    version: "1.0.0"
  });

  // Register read-only tools
  server.registerTool(
    "get_capabilities",
    {
      title: "Get BookStack Capabilities",
      description: "Get information about available BookStack MCP capabilities and current configuration",
      inputSchema: {}
    },
    async () => {
      const capabilities = {
        server_name: "BookStack MCP Server",
        version: "1.0.0",
        write_operations_enabled: config.enableWrite,
        available_tools: config.enableWrite ? "All tools enabled" : "Read-only tools only",
        security_note: config.enableWrite
          ? "⚠️  Write operations are ENABLED - AI can create and modify BookStack content"
          : "🛡️  Read-only mode - Safe for production use"
      };
      return {
        content: [{ type: "text", text: JSON.stringify(capabilities, null, 2) }]
      };
    }
  );

  server.registerTool(
    "search_content",
    {
      title: "Search BookStack Content",
      description: "Search across BookStack content with contextual previews and location info",
      inputSchema: {
        query: z.string().describe("Search query. Use BookStack advanced search syntax like {type:page} or {book_id:5}"),
        type: z.enum(["book", "page", "chapter", "bookshelf"]).optional().describe("Filter by content type"),
        count: z.number().max(500).optional().describe("Number of results to return (max 500)"),
        offset: z.number().optional().describe("Number of results to skip for pagination")
      }
    },
    toolHandler(async (args) => {
      const results = await client.searchContent(args.query, {
        type: args.type,
        count: args.count,
        offset: args.offset
      });
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }]
      };
    })
  );

  server.registerTool(
    "search_pages",
    {
      title: "Search Pages",
      description: "Search specifically for pages with optional book filtering",
      inputSchema: {
        query: z.string().describe("Search query for pages"),
        book_id: z.number().optional().describe("Filter results to pages within a specific book"),
        count: z.number().max(500).optional().describe("Number of results to return"),
        offset: z.number().optional().describe("Pagination offset")
      }
    },
    toolHandler(async (args) => {
      const results = await client.searchPages(args.query, {
        bookId: args.book_id,
        count: args.count,
        offset: args.offset
      });
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }]
      };
    })
  );

  server.registerTool(
    "get_books",
    {
      title: "List Books",
      description: "List available books with advanced filtering and sorting",
      inputSchema: {
        offset: z.number().default(0).describe("Pagination offset"),
        count: z.number().max(500).default(50).describe("Number of results to return"),
        sort: z.string().optional().describe("Sort field (e.g., 'name', '-created_at', 'updated_at')"),
        filter: z.record(z.any()).optional().describe("Filter criteria")
      }
    },
    toolHandler(async (args) => {
      const books = await client.getBooks({
        offset: args.offset,
        count: args.count,
        sort: args.sort,
        filter: args.filter
      });
      return {
        content: [{ type: "text", text: JSON.stringify(books, null, 2) }]
      };
    })
  );

  server.registerTool(
    "get_book",
    {
      title: "Get Book Details",
      description: "Get detailed information about a specific book",
      inputSchema: {
        id: z.number().describe("Book ID")
      }
    },
    toolHandler(async (args) => {
      const book = await client.getBook(args.id);
      return {
        content: [{ type: "text", text: JSON.stringify(book, null, 2) }]
      };
    })
  );

  server.registerTool(
    "get_pages",
    {
      title: "List Pages",
      description: "List pages with content previews, word counts, and contextual information",
      inputSchema: {
        book_id: z.number().optional().describe("Filter by book ID"),
        chapter_id: z.number().optional().describe("Filter by chapter ID"),
        offset: z.number().default(0).describe("Pagination offset"),
        count: z.number().max(500).default(50).describe("Number of results to return"),
        sort: z.string().optional().describe("Sort field"),
        filter: z.record(z.any()).optional().describe("Additional filter criteria")
      }
    },
    toolHandler(async (args) => {
      const pages = await client.getPages({
        bookId: args.book_id,
        chapterId: args.chapter_id,
        offset: args.offset,
        count: args.count,
        sort: args.sort,
        filter: args.filter
      });
      return {
        content: [{ type: "text", text: JSON.stringify(pages, null, 2) }]
      };
    })
  );

  server.registerTool(
    "get_page",
    {
      title: "Get Page Content",
      description: "Get full content of a specific page",
      inputSchema: {
        id: z.number().describe("Page ID")
      }
    },
    toolHandler(async (args) => {
      const page = await client.getPage(args.id);
      return {
        content: [{ type: "text", text: JSON.stringify(page, null, 2) }]
      };
    })
  );

  server.registerTool(
    "get_chapters",
    {
      title: "List Chapters",
      description: "List chapters, optionally filtered by book",
      inputSchema: {
        book_id: z.number().optional().describe("Filter by book ID"),
        offset: z.number().default(0).describe("Pagination offset"),
        count: z.number().default(50).describe("Number of results to return")
      }
    },
    toolHandler(async (args) => {
      const chapters = await client.getChapters(args.book_id, args.offset, args.count);
      return {
        content: [{ type: "text", text: JSON.stringify(chapters, null, 2) }]
      };
    })
  );

  server.registerTool(
    "get_chapter",
    {
      title: "Get Chapter Details",
      description: "Get details of a specific chapter",
      inputSchema: {
        id: z.number().describe("Chapter ID")
      }
    },
    toolHandler(async (args) => {
      const chapter = await client.getChapter(args.id);
      return {
        content: [{ type: "text", text: JSON.stringify(chapter, null, 2) }]
      };
    })
  );

  server.registerTool(
    "export_page",
    {
      title: "Export Page",
      description: "Export a page in various formats (PDF/ZIP provide direct BookStack download URLs)",
      inputSchema: {
        id: z.number().describe("Page ID"),
        format: z.enum(["html", "pdf", "markdown", "plaintext", "zip"]).describe("Export format")
      }
    },
    toolHandler(async (args) => {
      const content = await client.exportPage(args.id, args.format);

      if (typeof content === 'object' && content.download_url && content.direct_download) {
        const format = args.format.toUpperCase();
        return {
          content: [{
            type: "text",
            text: `✅ **${format} Export Ready**\n\n` +
                  `📄 **Page:** ${content.page_name}\n` +
                  `📚 **Book:** ${content.book_name}\n` +
                  `📁 **File:** ${content.filename}\n\n` +
                  `🚀 **Direct Download Link:**\n${content.download_url}\n\n` +
                  `ℹ️  **Note:** ${content.note}`
          }]
        };
      }

      const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      return {
        content: [{ type: "text", text }]
      };
    })
  );

  server.registerTool(
    "export_book",
    {
      title: "Export Book",
      description: "Export an entire book in various formats",
      inputSchema: {
        id: z.number().describe("Book ID"),
        format: z.enum(["html", "pdf", "markdown", "plaintext", "zip"]).describe("Export format")
      }
    },
    toolHandler(async (args) => {
      const content = await client.exportBook(args.id, args.format);

      if (typeof content === 'object' && content.download_url) {
        const format = args.format.toUpperCase();
        return {
          content: [{
            type: "text",
            text: `✅ **${format} Book Export Ready**\n\n` +
                  `📚 **Book:** ${content.book_name}\n` +
                  `📁 **File:** ${content.filename}\n\n` +
                  `🚀 **Direct Download Link:**\n${content.download_url}\n\n` +
                  `ℹ️  **Note:** ${content.note}`
          }]
        };
      }

      const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      return {
        content: [{ type: "text", text }]
      };
    })
  );

  server.registerTool(
    "export_chapter",
    {
      title: "Export Chapter",
      description: "Export a chapter in various formats",
      inputSchema: {
        id: z.number().describe("Chapter ID"),
        format: z.enum(["html", "pdf", "markdown", "plaintext", "zip"]).describe("Export format")
      }
    },
    toolHandler(async (args) => {
      const content = await client.exportChapter(args.id, args.format);

      if (typeof content === 'object' && content.download_url) {
        const format = args.format.toUpperCase();
        return {
          content: [{
            type: "text",
            text: `✅ **${format} Chapter Export Ready**\n\n` +
                  `📖 **Chapter:** ${content.chapter_name}\n` +
                  `📚 **Book:** ${content.book_name}\n` +
                  `📁 **File:** ${content.filename}\n\n` +
                  `🚀 **Direct Download Link:**\n${content.download_url}\n\n` +
                  `ℹ️  **Note:** ${content.note}`
          }]
        };
      }

      const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      return {
        content: [{ type: "text", text }]
      };
    })
  );

  server.registerTool(
    "get_recent_changes",
    {
      title: "Get Recent Changes",
      description: "Get recently updated content with contextual previews and change descriptions",
      inputSchema: {
        type: z.enum(["all", "page", "book", "chapter"]).default("all").describe("Filter by content type"),
        limit: z.number().max(100).default(20).describe("Number of recent items to return"),
        days: z.number().default(30).describe("Number of days back to look for changes")
      }
    },
    toolHandler(async (args) => {
      const changes = await client.getRecentChanges({
        type: args.type,
        limit: args.limit,
        days: args.days
      });
      return {
        content: [{ type: "text", text: JSON.stringify(changes, null, 2) }]
      };
    })
  );

  server.registerTool(
    "get_shelves",
    {
      title: "List Shelves",
      description: "List available book shelves (collections) with filtering and sorting",
      inputSchema: {
        offset: z.number().default(0).describe("Pagination offset"),
        count: z.number().max(500).default(50).describe("Number of results to return"),
        sort: z.string().optional().describe("Sort field"),
        filter: z.record(z.any()).optional().describe("Filter criteria")
      }
    },
    toolHandler(async (args) => {
      const shelves = await client.getShelves({
        offset: args.offset,
        count: args.count,
        sort: args.sort,
        filter: args.filter
      });
      return {
        content: [{ type: "text", text: JSON.stringify(shelves, null, 2) }]
      };
    })
  );

  server.registerTool(
    "get_shelf",
    {
      title: "Get Shelf Details",
      description: "Get details of a specific book shelf including all books",
      inputSchema: {
        id: z.number().describe("Shelf ID")
      }
    },
    toolHandler(async (args) => {
      const shelf = await client.getShelf(args.id);
      return {
        content: [{ type: "text", text: JSON.stringify(shelf, null, 2) }]
      };
    })
  );

  server.registerTool(
    "get_attachments",
    {
      title: "List Attachments",
      description: "List attachments (files and links) with filtering and sorting",
      inputSchema: {
        offset: z.number().default(0).describe("Pagination offset"),
        count: z.number().max(500).default(50).describe("Number of results to return"),
        sort: z.string().optional().describe("Sort field"),
        filter: z.record(z.any()).optional().describe("Filter criteria")
      }
    },
    toolHandler(async (args) => {
      const attachments = await client.getAttachments({
        offset: args.offset,
        count: args.count,
        sort: args.sort,
        filter: args.filter
      });
      return {
        content: [{ type: "text", text: JSON.stringify(attachments, null, 2) }]
      };
    })
  );

  server.registerTool(
    "get_attachment",
    {
      title: "Get Attachment Details",
      description: "Get details of a specific attachment including download links",
      inputSchema: {
        id: z.number().describe("Attachment ID")
      }
    },
    toolHandler(async (args) => {
      const attachment = await client.getAttachment(args.id);
      return {
        content: [{ type: "text", text: JSON.stringify(attachment, null, 2) }]
      };
    })
  );

  // Register write tools if enabled
  if (config.enableWrite) {
    server.registerTool(
      "create_page",
      {
        title: "Create Page",
        description: "Create a new page in BookStack",
        inputSchema: {
          name: z.string().describe("Page name"),
          book_id: z.number().describe("Book ID where the page will be created"),
          chapter_id: z.number().optional().describe("Optional: Chapter ID if page should be in a chapter"),
          html: z.string().optional().describe("Optional: HTML content"),
          markdown: z.string().optional().describe("Optional: Markdown content")
        }
      },
      toolHandler(async (args) => {
        const page = await client.createPage({
          name: args.name,
          book_id: args.book_id,
          chapter_id: args.chapter_id,
          html: args.html,
          markdown: args.markdown
        });
        return {
          content: [{ type: "text", text: JSON.stringify(page, null, 2) }]
        };
      })
    );

    server.registerTool(
      "update_page",
      {
        title: "Update Page",
        description: "Update an existing page",
        inputSchema: {
          id: z.number().describe("Page ID"),
          name: z.string().optional().describe("Optional: New page name"),
          html: z.string().optional().describe("Optional: New HTML content"),
          markdown: z.string().optional().describe("Optional: New Markdown content")
        }
      },
      toolHandler(async (args) => {
        const page = await client.updatePage(args.id, {
          name: args.name,
          html: args.html,
          markdown: args.markdown
        });
        return {
          content: [{ type: "text", text: JSON.stringify(page, null, 2) }]
        };
      })
    );

    server.registerTool(
      "create_shelf",
      {
        title: "Create Shelf",
        description: "Create a new book shelf (collection)",
        inputSchema: {
          name: z.string().describe("Shelf name"),
          description: z.string().optional().describe("Shelf description"),
          books: z.array(z.number()).optional().describe("Array of book IDs to add to the shelf"),
          tags: z.array(z.object({
            name: z.string(),
            value: z.string()
          }).strict()).optional().describe("Tags for the shelf")
        }
      },
      toolHandler(async (args) => {
        const shelf = await client.createShelf({
          name: args.name,
          description: args.description,
          books: args.books,
          tags: args.tags as any
        });
        return {
          content: [{ type: "text", text: JSON.stringify(shelf, null, 2) }]
        };
      })
    );

    server.registerTool(
      "update_shelf",
      {
        title: "Update Shelf",
        description: "Update an existing book shelf",
        inputSchema: {
          id: z.number().describe("Shelf ID"),
          name: z.string().optional().describe("New shelf name"),
          description: z.string().optional().describe("New shelf description"),
          books: z.array(z.number()).optional().describe("Array of book IDs"),
          tags: z.array(z.object({
            name: z.string(),
            value: z.string()
          }).strict()).optional().describe("Tags for the shelf")
        }
      },
      toolHandler(async (args) => {
        const shelf = await client.updateShelf(args.id, {
          name: args.name,
          description: args.description,
          books: args.books,
          tags: args.tags as any
        });
        return {
          content: [{ type: "text", text: JSON.stringify(shelf, null, 2) }]
        };
      })
    );

    server.registerTool(
      "delete_shelf",
      {
        title: "Delete Shelf",
        description: "Delete a book shelf (collection)",
        inputSchema: {
          id: z.number().describe("Shelf ID")
        }
      },
      toolHandler(async (args) => {
        const result = await client.deleteShelf(args.id);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      })
    );

    server.registerTool(
      "create_attachment",
      {
        title: "Create Attachment",
        description: "Create a new link attachment to a page",
        inputSchema: {
          name: z.string().describe("Attachment name"),
          uploaded_to: z.number().describe("Page ID where attachment will be attached"),
          link: z.string().url().refine(
            (url) => url.startsWith('http://') || url.startsWith('https://'),
            { message: "Only http and https URLs are allowed" }
          ).describe("URL for link attachment")
        }
      },
      toolHandler(async (args) => {
        const attachment = await client.createAttachment({
          name: args.name,
          uploaded_to: args.uploaded_to,
          link: args.link
        });
        return {
          content: [{ type: "text", text: JSON.stringify(attachment, null, 2) }]
        };
      })
    );

    server.registerTool(
      "update_attachment",
      {
        title: "Update Attachment",
        description: "Update an existing attachment",
        inputSchema: {
          id: z.number().describe("Attachment ID"),
          name: z.string().optional().describe("New attachment name"),
          link: z.string().url().refine(
            (url) => url.startsWith('http://') || url.startsWith('https://'),
            { message: "Only http and https URLs are allowed" }
          ).optional().describe("New URL for link attachment"),
          uploaded_to: z.number().optional().describe("Move attachment to different page")
        }
      },
      toolHandler(async (args) => {
        const attachment = await client.updateAttachment(args.id, {
          name: args.name,
          link: args.link,
          uploaded_to: args.uploaded_to
        });
        return {
          content: [{ type: "text", text: JSON.stringify(attachment, null, 2) }]
        };
      })
    );

    server.registerTool(
      "delete_attachment",
      {
        title: "Delete Attachment",
        description: "Delete an attachment",
        inputSchema: {
          id: z.number().describe("Attachment ID")
        }
      },
      toolHandler(async (args) => {
        const result = await client.deleteAttachment(args.id);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      })
    );
  }

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("BookStack MCP server running on stdio");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
