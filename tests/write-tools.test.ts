import { describe, test, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  createWriteClient,
  hasTestCredentials,
  hasSeedData,
  loadSeedData,
  createTestTextFile,
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

describe('Book CRUD', () => {
  test.skipIf(!canRun())('create_book creates and is retrievable', async () => {
    let bookId: number | undefined;
    try {
      const book = await client.createBook({
        name: 'Test Book Create',
        description: 'Created by write test',
      });
      bookId = book.id;
      expect(book.id).toBeGreaterThan(0);
      expect(book.name).toBe('Test Book Create');
      expect(book.description).toContain('Created by write test');

      const fetched = await client.getBook(bookId);
      expect(fetched.name).toBe('Test Book Create');
    } finally {
      if (bookId) await client.deleteBook(bookId);
    }
  });

  test.skipIf(!canRun())('update_book modifies name and description', async () => {
    let bookId: number | undefined;
    try {
      const book = await client.createBook({
        name: 'Test Book Update Before',
        description: 'Original description',
      });
      bookId = book.id;

      const updated = await client.updateBook(bookId, {
        name: 'Test Book Update After',
        description: 'Updated description',
      });
      expect(updated.name).toBe('Test Book Update After');
      expect(updated.description).toContain('Updated description');
    } finally {
      if (bookId) await client.deleteBook(bookId);
    }
  });

  test.skipIf(!canRun())('delete_book removes the book', async () => {
    const book = await client.createBook({ name: 'Test Book Delete' });
    await client.deleteBook(book.id);

    await expect(client.getBook(book.id)).rejects.toThrow();
  });
});

describe('Chapter CRUD', () => {
  test.skipIf(!canRun())('create_chapter creates in seed book', async () => {
    let chapterId: number | undefined;
    try {
      const chapter = await client.createChapter({
        book_id: seed.bookId,
        name: 'Test Chapter Create',
        description: 'Created by write test',
      });
      chapterId = chapter.id;
      expect(chapter.id).toBeGreaterThan(0);
      expect(chapter.name).toBe('Test Chapter Create');

      const fetched = await client.getChapter(chapterId);
      expect(fetched.name).toBe('Test Chapter Create');
    } finally {
      if (chapterId) await client.deleteChapter(chapterId);
    }
  });

  test.skipIf(!canRun())('update_chapter modifies name', async () => {
    let chapterId: number | undefined;
    try {
      const chapter = await client.createChapter({
        book_id: seed.bookId,
        name: 'Test Chapter Update Before',
      });
      chapterId = chapter.id;

      const updated = await client.updateChapter(chapterId, {
        name: 'Test Chapter Update After',
        description: 'Now has a description',
      });
      expect(updated.name).toBe('Test Chapter Update After');
    } finally {
      if (chapterId) await client.deleteChapter(chapterId);
    }
  });

  test.skipIf(!canRun())('delete_chapter removes the chapter', async () => {
    const chapter = await client.createChapter({
      book_id: seed.bookId,
      name: 'Test Chapter Delete',
    });
    await client.deleteChapter(chapter.id);

    await expect(client.getChapter(chapter.id)).rejects.toThrow();
  });
});

describe('Page CRUD', () => {
  test.skipIf(!canRun())('create_page creates in seed book', async () => {
    let pageId: number | undefined;
    try {
      const page = await client.createPage({
        name: 'Test Page Create',
        book_id: seed.bookId,
        html: '<p>Test page content</p>',
      });
      pageId = page.id;
      expect(page.id).toBeGreaterThan(0);
      expect(page.name).toBe('Test Page Create');

      const fetched = await client.getPage(pageId);
      expect(fetched.html).toContain('Test page content');
    } finally {
      if (pageId) await client.deletePage(pageId);
    }
  });

  test.skipIf(!canRun())('update_page modifies content', async () => {
    let pageId: number | undefined;
    try {
      const page = await client.createPage({
        name: 'Test Page Update',
        book_id: seed.bookId,
        html: '<p>Original</p>',
      });
      pageId = page.id;

      const updated = await client.updatePage(pageId, {
        name: 'Test Page Updated',
        html: '<p>Modified content</p>',
      });
      expect(updated.name).toBe('Test Page Updated');

      const fetched = await client.getPage(pageId);
      expect(fetched.html).toContain('Modified content');
    } finally {
      if (pageId) await client.deletePage(pageId);
    }
  });

  test.skipIf(!canRun())('delete_page removes the page', async () => {
    const page = await client.createPage({
      name: 'Test Page Delete',
      book_id: seed.bookId,
      html: '<p>To be deleted</p>',
    });
    await client.deletePage(page.id);

    await expect(client.getPage(page.id)).rejects.toThrow();
  });
});

describe('Shelf CRUD', () => {
  test.skipIf(!canRun())('create_shelf creates with book', async () => {
    let shelfId: number | undefined;
    try {
      const shelf = await client.createShelf({
        name: 'Test Shelf Create',
        description: 'Created by write test',
        books: [seed.bookId],
      });
      shelfId = shelf.id;
      expect(shelf.id).toBeGreaterThan(0);
      expect(shelf.name).toBe('Test Shelf Create');

      const fetched = await client.getShelf(shelfId);
      expect(fetched.name).toBe('Test Shelf Create');
    } finally {
      if (shelfId) await client.deleteShelf(shelfId);
    }
  });

  test.skipIf(!canRun())('update_shelf modifies name', async () => {
    let shelfId: number | undefined;
    try {
      const shelf = await client.createShelf({
        name: 'Test Shelf Update Before',
      });
      shelfId = shelf.id;

      const updated = await client.updateShelf(shelfId, {
        name: 'Test Shelf Update After',
        description: 'Now has description',
      });
      expect(updated.name).toBe('Test Shelf Update After');
    } finally {
      if (shelfId) await client.deleteShelf(shelfId);
    }
  });

  test.skipIf(!canRun())('delete_shelf removes the shelf', async () => {
    const shelf = await client.createShelf({ name: 'Test Shelf Delete' });
    await client.deleteShelf(shelf.id);

    await expect(client.getShelf(shelf.id)).rejects.toThrow();
  });
});

describe('Attachment CRUD', () => {
  test.skipIf(!canRun())('create_attachment creates link attachment', async () => {
    let attachmentId: number | undefined;
    try {
      const attachment = await client.createAttachment({
        name: 'Test Link Attachment',
        uploaded_to: seed.pageId,
        link: 'https://example.com/test-link',
      });
      attachmentId = attachment.id;
      expect(attachment.id).toBeGreaterThan(0);
      expect(attachment.name).toBe('Test Link Attachment');

      const fetched = await client.getAttachment(attachmentId);
      expect(fetched.name).toBe('Test Link Attachment');
    } finally {
      if (attachmentId) await client.deleteAttachment(attachmentId);
    }
  });

  test.skipIf(!canRun())('upload_attachment uploads a file', async () => {
    let attachmentId: number | undefined;
    const tmpFile = path.join(os.tmpdir(), `bookstack-test-${Date.now()}.txt`);
    try {
      fs.writeFileSync(tmpFile, createTestTextFile());

      const attachment = await client.uploadAttachment({
        file_path: tmpFile,
        uploaded_to: seed.pageId,
        name: 'Test Uploaded File',
      });
      attachmentId = attachment.id;
      expect(attachment.id).toBeGreaterThan(0);
      expect(attachment.name).toBe('Test Uploaded File');

      const fetched = await client.getAttachment(attachmentId);
      expect(fetched.name).toBe('Test Uploaded File');
    } finally {
      if (attachmentId) await client.deleteAttachment(attachmentId);
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  });

  test.skipIf(!canRun())('update_attachment modifies name', async () => {
    let attachmentId: number | undefined;
    try {
      const attachment = await client.createAttachment({
        name: 'Test Attachment Update Before',
        uploaded_to: seed.pageId,
        link: 'https://example.com/before',
      });
      attachmentId = attachment.id;

      const updated = await client.updateAttachment(attachmentId, {
        name: 'Test Attachment Update After',
      });
      expect(updated.name).toBe('Test Attachment Update After');
    } finally {
      if (attachmentId) await client.deleteAttachment(attachmentId);
    }
  });

  test.skipIf(!canRun())('delete_attachment removes the attachment', async () => {
    const attachment = await client.createAttachment({
      name: 'Test Attachment Delete',
      uploaded_to: seed.pageId,
      link: 'https://example.com/delete-me',
    });
    await client.deleteAttachment(attachment.id);

    await expect(client.getAttachment(attachment.id)).rejects.toThrow();
  });
});
