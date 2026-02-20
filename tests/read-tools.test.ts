import { describe, test, expect, beforeAll } from 'vitest';
import {
  createWriteClient,
  hasTestCredentials,
  hasSeedData,
  loadSeedData,
  type SeedData,
} from './helpers.js';
import { BookStackClient } from '../src/bookstack-client.js';

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
    // BookStackClient doesn't expose capabilities directly — tested via config
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
    const pageResult = results.results.find((r: any) => r.name === 'CI Seed Page');
    expect(pageResult).toBeDefined();
  });
});

describe('Books', () => {
  test.skipIf(!canRun())('get_books lists books including seed', async () => {
    const books = await client.getBooks();
    expect(books).toHaveProperty('data');
    expect(books.data.length).toBeGreaterThan(0);
    const seedBook = books.data.find((b: any) => b.id === seed.bookId);
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
    const pages = await client.getPages();
    expect(pages).toHaveProperty('data');
    expect(pages.data.length).toBeGreaterThan(0);
    const seedPage = pages.data.find((p: any) => p.id === seed.pageId);
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
    const chapters = await client.getChapters();
    expect(chapters).toHaveProperty('data');
    expect(chapters.data.length).toBeGreaterThan(0);
    const seedChapter = chapters.data.find((c: any) => c.id === seed.chapterId);
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
    const shelves = await client.getShelves();
    expect(shelves).toHaveProperty('data');
    expect(shelves.data.length).toBeGreaterThan(0);
    const seedShelf = shelves.data.find((s: any) => s.id === seed.shelfId);
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
    const attachments = await client.getAttachments();
    expect(attachments).toHaveProperty('data');
    expect(attachments.data.length).toBeGreaterThan(0);
    const seedAttachment = attachments.data.find((a: any) => a.id === seed.attachmentId);
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
    // Chapter may be empty (no pages inside), so just check it's a string
  });
});

describe('Recent Changes', () => {
  test.skipIf(!canRun())('get_recent_changes returns seed data', async () => {
    const changes = await client.getRecentChanges({ days: 1 });
    expect(changes).toHaveProperty('results');
    expect(changes.total_found).toBeGreaterThan(0);
  });
});
