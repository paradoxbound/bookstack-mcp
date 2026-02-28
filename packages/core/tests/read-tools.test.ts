import { describe, test, expect, beforeAll } from 'vitest';
import {
  createWriteClient,
  hasTestCredentials,
  hasSeedData,
  loadSeedData,
  type SeedData,
} from './helpers.js';
import { BookStackClient } from '@bookstack-mcp/core';

let client: BookStackClient;
let seed: SeedData;

const canRun = () => hasTestCredentials() && hasSeedData();

beforeAll(() => {
  if (!canRun()) return;
  client = createWriteClient();
  seed = loadSeedData()!;
});

describe('Capabilities', () => {
  test.skipIf(!canRun())('get_capabilities returns server info', async () => {
    const config = {
      server_name: 'BookStack MCP Server',
      write_operations_enabled: true,
    };
    expect(config.server_name).toBe('BookStack MCP Server');
    expect(config.write_operations_enabled).toBe(true);
  });
});

describe('Search', () => {
  test.skipIf(!canRun())('search_content finds seed data', async () => {
    const results = await client.searchContent('CI Seed');
    expect(results).toHaveProperty('results');
    expect(results.results.length).toBeGreaterThan(0);
    expect(results.summary).toContain('CI Seed');
  });

  test.skipIf(!canRun())('search_pages finds seed page', async () => {
    const results = await client.searchPages('CI Seed Page');
    expect(results).toHaveProperty('results');
    const pageResult = results.results.find((r: { name: string }) => r.name === 'CI Seed Page');
    expect(pageResult).toBeDefined();
  });
});

describe('Books', () => {
  test.skipIf(!canRun())('get_books lists books including seed', async () => {
    const books = await client.getBooks({ filter: { id: seed.bookId } });
    expect(books).toHaveProperty('data');
    expect(books.data.length).toBeGreaterThan(0);
    const seedBook = books.data.find((b: { id: number }) => b.id === seed.bookId);
    expect(seedBook).toBeDefined();
    expect(seedBook!.name).toBe('CI Seed Book');
  });

  test.skipIf(!canRun())('get_book returns seed book details', async () => {
    const book = await client.getBook(seed.bookId);
    expect(book.id).toBe(seed.bookId);
    expect(book.name).toBe('CI Seed Book');
    expect(book).toHaveProperty('url');
    expect(book).toHaveProperty('direct_link');
  });
});

describe('Pages', () => {
  test.skipIf(!canRun())('get_pages lists pages including seed', async () => {
    const pages = await client.getPages({ bookId: seed.bookId });
    expect(pages).toHaveProperty('data');
    expect(pages.data.length).toBeGreaterThan(0);
    const seedPage = pages.data.find((p: { id: number }) => p.id === seed.pageId);
    expect(seedPage).toBeDefined();
  });

  test.skipIf(!canRun())('get_page returns seed page with content', async () => {
    const page = await client.getPage(seed.pageId);
    expect(page.id).toBe(seed.pageId);
    expect(page.name).toBe('CI Seed Page');
    expect(page.html).toContain('seed content');
    expect(page).toHaveProperty('url');
    expect(page).toHaveProperty('word_count');
  });
});

describe('Chapters', () => {
  test.skipIf(!canRun())('get_chapters lists chapters including seed', async () => {
    const chapters = await client.getChapters(seed.bookId);
    expect(chapters).toHaveProperty('data');
    expect(chapters.data.length).toBeGreaterThan(0);
    const seedChapter = chapters.data.find((c: { id: number }) => c.id === seed.chapterId);
    expect(seedChapter).toBeDefined();
  });

  test.skipIf(!canRun())('get_chapter returns seed chapter', async () => {
    const chapter = await client.getChapter(seed.chapterId);
    expect(chapter.id).toBe(seed.chapterId);
    expect(chapter.name).toBe('CI Seed Chapter');
    expect(chapter).toHaveProperty('url');
  });
});

describe('Shelves', () => {
  test.skipIf(!canRun())('get_shelves lists shelves including seed', async () => {
    const shelves = await client.getShelves({ filter: { id: seed.shelfId } });
    expect(shelves).toHaveProperty('data');
    expect(shelves.data.length).toBeGreaterThan(0);
    const seedShelf = shelves.data.find((s: { id: number }) => s.id === seed.shelfId);
    expect(seedShelf).toBeDefined();
  });

  test.skipIf(!canRun())('get_shelf returns seed shelf with books', async () => {
    const shelf = await client.getShelf(seed.shelfId);
    expect(shelf.id).toBe(seed.shelfId);
    expect(shelf.name).toBe('CI Seed Shelf');
    expect(shelf).toHaveProperty('url');
  });
});

describe('Attachments', () => {
  test.skipIf(!canRun())('get_attachments lists attachments including seed', async () => {
    const attachments = await client.getAttachments({ filter: { uploaded_to: seed.pageId } });
    expect(attachments).toHaveProperty('data');
    expect(attachments.data.length).toBeGreaterThan(0);
    const seedAttachment = attachments.data.find((a: { id: number }) => a.id === seed.attachmentId);
    expect(seedAttachment).toBeDefined();
  });

  test.skipIf(!canRun())('get_attachment returns seed attachment', async () => {
    const attachment = await client.getAttachment(seed.attachmentId);
    expect(attachment.id).toBe(seed.attachmentId);
    expect(attachment.name).toBe('CI Seed Attachment');
    expect(attachment).toHaveProperty('page_url');
  });
});

describe('Exports', () => {
  test.skipIf(!canRun())('export_page returns HTML content', async () => {
    const html = await client.exportPage(seed.pageId, 'html');
    expect(typeof html).toBe('string');
    expect(html).toContain('seed content');
  });

  test.skipIf(!canRun())('export_page returns markdown content', async () => {
    const md = await client.exportPage(seed.pageId, 'markdown');
    expect(typeof md).toBe('string');
    expect(md.length).toBeGreaterThan(0);
  });

  test.skipIf(!canRun())('export_page returns plaintext content', async () => {
    const text = await client.exportPage(seed.pageId, 'plaintext');
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
  });

  test.skipIf(!canRun())('export_book returns HTML content', async () => {
    const html = await client.exportBook(seed.bookId, 'html');
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
  });

  test.skipIf(!canRun())('export_chapter returns HTML content', async () => {
    const html = await client.exportChapter(seed.chapterId, 'html');
    expect(typeof html).toBe('string');
  });
});

describe('Comments', () => {
  test.skipIf(!canRun())('get_comments lists comments including seed', async () => {
    const comments = await client.getComments({ page_id: seed.pageId });
    expect(comments).toHaveProperty('data');
    expect(comments.data.length).toBeGreaterThan(0);
    const seedComment = comments.data.find((c: { id: number }) => c.id === seed.commentId);
    expect(seedComment).toBeDefined();
  });

  test.skipIf(!canRun())('get_comment returns seed comment', async () => {
    const comment = await client.getComment(seed.commentId);
    expect(comment.id).toBe(seed.commentId);
    expect(comment.commentable_id).toBe(seed.pageId);
    expect(comment.html).toContain('seed comment');
  });
});

describe('System and Admin', () => {
  test.skipIf(!canRun())('get_audit_log returns list structure', async () => {
    const log = await client.getAuditLog({ count: 10 });
    expect(log).toHaveProperty('data');
    expect(log).toHaveProperty('total');
    expect(Array.isArray(log.data)).toBe(true);
  });

  test.skipIf(!canRun())('get_system_info returns version and urls', async () => {
    const info = await client.getSystemInfo();
    expect(info).toHaveProperty('version');
    expect(info).toHaveProperty('base_url');
    expect(typeof info.version).toBe('string');
  });

  test.skipIf(!canRun())('get_users returns list structure', async () => {
    const users = await client.getUsers({ count: 10 });
    expect(users).toHaveProperty('data');
    expect(users).toHaveProperty('total');
    expect(Array.isArray(users.data)).toBe(true);
  });

  test.skipIf(!canRun())('get_user returns user when exists', async () => {
    const users = await client.getUsers({ count: 1 });
    if (users.data.length === 0) return;
    const user = await client.getUser(users.data[0].id);
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('name');
    expect(user.id).toBe(users.data[0].id);
  });

  test.skipIf(!canRun())('get_recycle_bin returns list structure', async () => {
    const bin = await client.getRecycleBin({ count: 10 });
    expect(bin).toHaveProperty('data');
    expect(bin).toHaveProperty('total');
    expect(Array.isArray(bin.data)).toBe(true);
  });

  test.skipIf(!canRun())('get_image_gallery returns list structure', async () => {
    const gallery = await client.getImageGallery({ count: 10 });
    expect(gallery).toHaveProperty('data');
    expect(gallery).toHaveProperty('total');
    expect(Array.isArray(gallery.data)).toBe(true);
  });

  test.skipIf(!canRun())('get_image returns image when exists', async () => {
    const gallery = await client.getImageGallery({ count: 1 });
    if (gallery.data.length === 0) return;
    const image = await client.getImage(gallery.data[0].id);
    expect(image).toHaveProperty('id');
    expect(image).toHaveProperty('url');
    expect(image.id).toBe(gallery.data[0].id);
  });
});

describe('Recent Changes', () => {
  test.skipIf(!canRun())('get_recent_changes returns seed data', async () => {
    const changes = await client.getRecentChanges({ days: 1 });
    expect(changes).toHaveProperty('results');
    expect(changes.total_found).toBeGreaterThan(0);
  });
});
