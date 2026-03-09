# BookStack MCP — Tool Reference

> For installation and quick start, see the [README](../README.md).

This reference documents all 45 tools exposed by BookStack MCP Server. Tools are invoked by MCP-compatible clients (Claude Desktop, LibreChat, etc.) using their registered names.

## Common patterns

### Pagination

All list tools accept `offset` (default: `0`) and `count` (default: `50`, max: `500`) for pagination.

### Sorting

The `sort` parameter accepts a field name for ascending order, or `-field_name` (with a leading dash) for descending order. Examples: `name`, `-created_at`, `updated_at`.

### Filters

The `filter` parameter accepts an object of key/value pairs applied as BookStack API filter criteria. Example: `{"name": "API Guide"}`.

### Response enhancement

All responses from BookStack are enhanced with additional fields before being returned to the MCP client:

| Added field | Description |
|---|---|
| `url` | Direct link to the item in BookStack |
| `direct_link` | Markdown-formatted `[Name](url)` link |
| `friendly_date` | Human-readable timestamp, e.g. "2 hours ago" |
| `content_preview` | 150–200 character excerpt of text content |
| `word_count` | Word count (pages only) |
| `location` | Contextual info: parent book name, chapter name (pages and chapters) |

---

## Read tools

These 26 tools are always available regardless of the `BOOKSTACK_ENABLE_WRITE` setting.

---

### get_capabilities

Returns a summary of the server's current configuration and available tools.

**Input:** none

**Output:** JSON object with fields: `server_name`, `version`, `write_operations_enabled` (boolean), `available_tools` (array of tool names), `security_note`.

---

### search_content

Performs a full-text search across all BookStack content types.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `query` | string | yes | | Search query. Supports BookStack advanced syntax, e.g. `{type:page}`, `{book_id:5}` |
| `type` | string | no | `"book"` \| `"page"` \| `"chapter"` \| `"bookshelf"` | Filter results to a specific content type |
| `count` | number | no | 1–500 | Number of results to return |
| `offset` | number | no | ≥0 | Pagination offset |

**Output:** JSON object with `search_query`, `search_url` (link to BookStack search UI), `summary`, and `results` array. Each result includes `type`, `name`, `url`, `direct_link`, `content_preview`, `location_info`, and standard entity fields.

---

### search_pages

Searches specifically within pages, with optional book scoping.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `query` | string | yes | | Search query |
| `book_id` | number | no | ≥1 | Restrict search to a specific book |
| `count` | number | no | 1–500 | Number of results |
| `offset` | number | no | ≥0 | Pagination offset |

**Output:** JSON with page search results and content previews.

---

### get_books

Lists all books with pagination, sorting, and filtering.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `offset` | number | no | ≥0, default 0 | Pagination offset |
| `count` | number | no | 1–500, default 50 | Results per page |
| `sort` | string | no | | Sort field, e.g. `name`, `-created_at` |
| `filter` | object | no | | Filter criteria |

**Output:** JSON with `data` (array of enhanced book objects) and `total` (integer). Each book includes `id`, `name`, `slug`, `description`, `url`, `direct_link`, `friendly_date`, `content_preview`, and timestamps.

---

### get_book

Gets detailed information about a single book.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | number | yes | ≥1 | Book ID |

**Output:** Enhanced book object with `id`, `name`, `slug`, `description`, `url`, `direct_link`, `friendly_date`, `created_at`, `updated_at`.

---

### get_pages

Lists pages with optional book and chapter filtering.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `book_id` | number | no | ≥1 | Filter by book ID |
| `chapter_id` | number | no | ≥1 | Filter by chapter ID |
| `offset` | number | no | ≥0, default 0 | Pagination offset |
| `count` | number | no | 1–500, default 50 | Results per page |
| `sort` | string | no | | Sort field |
| `filter` | object | no | | Additional filters |

**Output:** JSON with `data` (enhanced page objects) and `total`. Each page includes `id`, `name`, `slug`, `book_id`, `chapter_id`, `url`, `direct_link`, `content_preview`, `word_count`, `location`, and timestamps.

---

### get_page

Gets the full content of a single page.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | number | yes | ≥1 | Page ID |

**Output:** Enhanced page object including `html`, `markdown`, `text` (plain text), `word_count`, `url`, `direct_link`, `location`, `friendly_date`, and all standard page fields.

---

### get_chapters

Lists chapters with optional book filtering.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `book_id` | number | no | ≥1 | Filter by book ID |
| `offset` | number | no | ≥0, default 0 | Pagination offset |
| `count` | number | no | 1–500, default 50 | Results per page |

**Output:** JSON with `data` (enhanced chapter objects) and `total`.

---

### get_chapter

Gets details of a single chapter.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | number | yes | ≥1 | Chapter ID |

**Output:** Enhanced chapter object with `id`, `name`, `slug`, `book_id`, `description`, `url`, `direct_link`, `friendly_date`, location info, and timestamps.

---

### get_shelves

Lists book shelves (collections of books).

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `offset` | number | no | ≥0, default 0 | Pagination offset |
| `count` | number | no | 1–500, default 50 | Results per page |
| `sort` | string | no | | Sort field |
| `filter` | object | no | | Filter criteria |

**Output:** JSON with `data` (enhanced shelf objects) and `total`. Each shelf includes `book_count`, an array of books, `tags_summary`, `url`, `direct_link`, and timestamps.

---

### get_shelf

Gets details of a single shelf including all its books.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | number | yes | ≥1 | Shelf ID |

**Output:** Enhanced shelf object with full `books` array, `tags`, `description`, `url`, `direct_link`, `friendly_date`, and timestamps.

---

### get_attachments

Lists file and link attachments.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `offset` | number | no | ≥0, default 0 | Pagination offset |
| `count` | number | no | 1–500, default 50 | Results per page |
| `sort` | string | no | | Sort field |
| `filter` | object | no | | Filter criteria |

**Output:** JSON with `data` (enhanced attachment objects) and `total`. Each includes `page_url` (link to the page the attachment belongs to) and `direct_link`.

---

### get_attachment

Gets details of a single attachment.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | number | yes | ≥1 | Attachment ID |

**Output:** Attachment object with `id`, `name`, `extension`, `uploaded_to` (page ID), `external` (boolean), `page_url`, `direct_link`, `download_url`, and timestamps.

---

### export_page

Exports a page in the specified format.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | number | yes | ≥1 | Page ID |
| `format` | string | yes | `"html"` \| `"pdf"` \| `"markdown"` \| `"plaintext"` \| `"zip"` | Export format |

**Output:**
- For `html`, `markdown`, `plaintext`: raw content string
- For `pdf`, `zip`: JSON object with `download_url`, `page_name`, `book_name`, `filename`, `note`

---

### export_book

Exports an entire book in the specified format.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | number | yes | ≥1 | Book ID |
| `format` | string | yes | `"html"` \| `"pdf"` \| `"markdown"` \| `"plaintext"` \| `"zip"` | Export format |

**Output:**
- For `html`, `markdown`, `plaintext`: raw content string
- For `pdf`, `zip`: JSON object with `download_url`, `book_name`, `filename`

---

### export_chapter

Exports a chapter in the specified format.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | number | yes | ≥1 | Chapter ID |
| `format` | string | yes | `"html"` \| `"pdf"` \| `"markdown"` \| `"plaintext"` \| `"zip"` | Export format |

**Output:**
- For `html`, `markdown`, `plaintext`: raw content string
- For `pdf`, `zip`: JSON object with `download_url`, `chapter_name`, `book_name`, `filename`

---

### get_recent_changes

Lists recently updated content across all content types.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `type` | string | no | `"all"` \| `"page"` \| `"book"` \| `"chapter"`, default `"all"` | Filter by content type |
| `limit` | number | no | 1–100, default 20 | Number of items |
| `days` | number | no | 1–365, default 30 | How many days back to search |

**Output:** JSON with `results` array. Each result includes `url`, `direct_link`, `content_preview`, `contextual_info`, `last_updated` (friendly date), `change_summary`.

---

### get_comments

Lists comments, optionally filtered to a specific page.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `page_id` | number | no | ≥1 | Filter comments to a specific page |
| `offset` | number | no | ≥0, default 0 | Pagination offset |
| `count` | number | no | 1–500, default 50 | Results per page |
| `sort` | string | no | e.g. `created_at`, `-created_at` | Sort field |

**Output:** JSON with `data` (comment objects) and `total`. Each comment includes `id`, `html`, `created_by`, `local_id`, `parent_id`, and timestamps.

---

### get_comment

Gets a single comment with its replies.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | number | yes | ≥1 | Comment ID |

**Output:** Comment object with `id`, `html`, `replies` (array), creator info, timestamps, and `content_ref`.

---

### get_audit_log

Lists the system audit log. Requires admin permissions in BookStack.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `offset` | number | no | ≥0, default 0 | Pagination offset |
| `count` | number | no | 1–500, default 50 | Results per page |
| `sort` | string | no | e.g. `-created_at` | Sort field |

**Output:** JSON with `data` (audit log entries) and `total`. Each entry includes `id`, `type`, `detail`, `user_id`, `loggable_type`, `loggable_id`, `ip`, `created_at`, `user`.

---

### get_system_info

Returns BookStack instance information.

**Input:** none

**Output:** JSON with `version`, `instance_id`, `app_name`, `app_logo` (optional), `base_url`.

---

### get_users

Lists BookStack users (read-only). Requires admin permissions in BookStack.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `offset` | number | no | ≥0, default 0 | Pagination offset |
| `count` | number | no | 1–500, default 50 | Results per page |
| `sort` | string | no | | Sort field |

**Output:** JSON with `data` (user objects) and `total`. Each user includes `id`, `name`, `email`, `slug`, and timestamps.

---

### get_user

Gets details of a single user (read-only). Requires admin permissions in BookStack.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | number | yes | ≥1 | User ID |

**Output:** User object with `id`, `name`, `email`, `slug`, `profile_url`, `edit_url`, `avatar_url`, `last_activity_at`, and timestamps.

---

### get_recycle_bin

Lists soft-deleted items in the recycle bin. Requires admin permissions in BookStack.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `offset` | number | no | ≥0, default 0 | Pagination offset |
| `count` | number | no | 1–500, default 50 | Results per page |
| `sort` | string | no | | Sort field |

**Output:** JSON with `data` (recycle bin entries) and `total`. Each entry includes `id`, `deleted_by`, `deletable_type`, `deletable_id`, and the full `deletable` object (the deleted book, page, etc.).

---

### get_image_gallery

Lists images in the BookStack image gallery (read-only).

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `offset` | number | no | ≥0, default 0 | Pagination offset |
| `count` | number | no | 1–500, default 50 | Results per page |
| `sort` | string | no | | Sort field |

**Output:** JSON with `data` (image gallery entries) and `total`. Each entry includes `id`, `name`, `url`, `path`, `type`, `uploaded_to`, creator info, and timestamps.

---

### get_image

Gets details of a single gallery image (read-only).

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | number | yes | ≥1 | Image ID |

**Output:** Image gallery entry with `id`, `name`, `url`, `path`, `type`, `uploaded_to`, creator/updater info, and timestamps.

---

## Write tools

These 19 tools are only registered when the server is started with `BOOKSTACK_ENABLE_WRITE=true`. Calling them without that setting enabled returns an error.

---

### create_book

Creates a new book.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `name` | string | yes | 1–255 chars | Book name |
| `description` | string | no | ≤1000 chars | Book description |
| `tags` | array | no | Array of `{name, value}` objects | Tags to apply |

**Output:** Enhanced book object (same shape as `get_book`).

---

### update_book

Updates an existing book.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | number | yes | ≥1 | Book ID |
| `name` | string | no | 1–255 chars | New name |
| `description` | string | no | ≤1000 chars | New description |
| `tags` | array | no | Array of `{name, value}` objects | Tags (replaces all existing tags) |

**Output:** Enhanced book object.

---

### delete_book

Deletes a book and all its contents.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | number | yes | ≥1 | Book ID |

**Output:** Deletion result object.

---

### create_chapter

Creates a new chapter inside a book.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `book_id` | number | yes | ≥1 | Parent book ID |
| `name` | string | yes | 1–255 chars | Chapter name |
| `description` | string | no | ≤1000 chars | Chapter description |
| `tags` | array | no | Array of `{name, value}` objects | Tags |

**Output:** Enhanced chapter object.

---

### update_chapter

Updates an existing chapter.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | number | yes | ≥1 | Chapter ID |
| `name` | string | no | 1–255 chars | New name |
| `description` | string | no | ≤1000 chars | New description |
| `book_id` | number | no | ≥1 | Move chapter to a different book |
| `tags` | array | no | Array of `{name, value}` objects | Tags (replaces all existing tags) |

**Output:** Enhanced chapter object.

---

### delete_chapter

Deletes a chapter. Its pages are moved up to the parent book.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | number | yes | ≥1 | Chapter ID |

**Output:** Deletion result object.

---

### create_page

Creates a new page in a book or chapter.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `name` | string | yes | 1–255 chars | Page name |
| `book_id` | number | yes | ≥1 | Parent book ID |
| `chapter_id` | number | no | ≥1 | Place the page inside a specific chapter |
| `html` | string | no | ≤1,000,000 chars | Page content as HTML |
| `markdown` | string | no | ≤1,000,000 chars | Page content as Markdown |

**Output:** Enhanced page object.

---

### update_page

Updates an existing page.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | number | yes | ≥1 | Page ID |
| `name` | string | no | 1–255 chars | New name |
| `html` | string | no | ≤1,000,000 chars | New content as HTML |
| `markdown` | string | no | ≤1,000,000 chars | New content as Markdown |

**Output:** Enhanced page object.

---

### delete_page

Deletes a page (moves it to the recycle bin).

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | number | yes | ≥1 | Page ID |

**Output:** Deletion result object.

---

### create_shelf

Creates a new book shelf.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `name` | string | yes | 1–255 chars | Shelf name |
| `description` | string | no | ≤1000 chars | Shelf description |
| `books` | array | no | Array of book ID numbers | Books to include on the shelf |
| `tags` | array | no | Array of `{name, value}` objects | Tags |

**Output:** Enhanced shelf object.

---

### update_shelf

Updates an existing shelf.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | number | yes | ≥1 | Shelf ID |
| `name` | string | no | 1–255 chars | New name |
| `description` | string | no | ≤1000 chars | New description |
| `books` | array | no | Array of book ID numbers | Books on the shelf (replaces existing list) |
| `tags` | array | no | Array of `{name, value}` objects | Tags (replaces all existing tags) |

**Output:** Enhanced shelf object.

---

### delete_shelf

Deletes a shelf. Books on the shelf are not deleted.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | number | yes | ≥1 | Shelf ID |

**Output:** Deletion result object.

---

### create_attachment

Creates a link attachment on a page.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `name` | string | yes | 1–255 chars | Attachment display name |
| `uploaded_to` | number | yes | ≥1 | Page ID to attach to |
| `link` | string | yes | HTTP/HTTPS URL, ≤2000 chars | URL for the link attachment |

**Output:** Attachment object with `id`, `name`, `page_url`, `direct_link`.

---

### upload_attachment

Uploads a local file as an attachment on a page.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `file_path` | string | yes | Absolute path | Path to the local file to upload. Supports `~` expansion. |
| `uploaded_to` | number | yes | ≥1 | Page ID to attach to |
| `name` | string | no | 1–255 chars | Attachment name (defaults to the filename) |

**Output:** Attachment object with `id`, `name`, `extension`, `page_url`, `direct_link`.

---

### update_attachment

Updates an existing attachment.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | number | yes | ≥1 | Attachment ID |
| `name` | string | no | 1–255 chars | New display name |
| `link` | string | no | HTTP/HTTPS URL, ≤2000 chars | New URL (for link attachments only) |
| `uploaded_to` | number | no | ≥1 | Move attachment to a different page |

**Output:** Updated attachment object.

---

### delete_attachment

Deletes an attachment.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | number | yes | ≥1 | Attachment ID |

**Output:** Deletion result object.

---

### create_comment

Creates a comment on a page, with optional reply support.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `page_id` | number | yes | ≥1 | Page to comment on |
| `html` | string | yes | 1–10,000 chars | Comment content as HTML |
| `reply_to` | number | no | ≥1 | `local_id` of the parent comment (for replies) |
| `content_ref` | string | no | | Content reference for inline comments |

**Output:** Comment object with `id`, `html`, `local_id`, `parent_id`, creator info, and timestamps.

---

### update_comment

Updates an existing comment.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | number | yes | ≥1 | Comment ID |
| `html` | string | no | 1–10,000 chars | New comment content |
| `archived` | boolean | no | | Archive or unarchive the comment (top-level comments only) |

**Output:** Updated comment object.

---

### delete_comment

Deletes a comment.

**Input:**

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | number | yes | ≥1 | Comment ID |

**Output:** Deletion result object.
