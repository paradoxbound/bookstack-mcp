import { BookStackClient } from '@bookstack-mcp/core';
import {
  getTestConfig,
  hasTestCredentials,
  saveSeedData,
} from './helpers.js';

export default async function globalSetup() {
  if (!hasTestCredentials()) {
    console.log('⏭  TEST_BOOKSTACK_* env vars not set — skipping global setup');
    return;
  }

  console.log('🌱 Creating seed data on test BookStack instance…');

  const client = new BookStackClient(getTestConfig(true));

  try {
    // 1. Create a book
    const book = await client.createBook({
      name: 'CI Seed Book',
      description: 'Automatically created by the test suite',
    });
    console.log(`   Book: ${book.name} (id=${book.id})`);

    // 2. Create a chapter inside the book
    const chapter = await client.createChapter({
      book_id: book.id,
      name: 'CI Seed Chapter',
      description: 'Chapter created by the test suite',
    });
    console.log(`   Chapter: ${chapter.name} (id=${chapter.id})`);

    // 3. Create a page inside the book
    const page = await client.createPage({
      name: 'CI Seed Page',
      book_id: book.id,
      html: '<p>This is seed content created by the BookStack MCP test suite.</p>',
    });
    console.log(`   Page: ${page.name} (id=${page.id})`);

    // 4. Create a shelf containing the book
    const shelf = await client.createShelf({
      name: 'CI Seed Shelf',
      description: 'Shelf created by the test suite',
      books: [book.id],
    });
    console.log(`   Shelf: ${shelf.name} (id=${shelf.id})`);

    // 5. Create a link attachment on the page
    const attachment = await client.createAttachment({
      name: 'CI Seed Attachment',
      uploaded_to: page.id,
      link: 'https://example.com/test-attachment',
    });
    console.log(`   Attachment: ${attachment.name} (id=${attachment.id})`);

    // 6. Create a comment on the page
    const comment = await client.createComment({
      page_id: page.id,
      html: '<p>This is a seed comment created by the test suite.</p>',
    });
    console.log(`   Comment: id=${comment.id}`);

    saveSeedData({
      bookId: book.id,
      bookSlug: book.slug,
      chapterId: chapter.id,
      pageId: page.id,
      shelfId: shelf.id,
      attachmentId: attachment.id,
      commentId: comment.id,
    });

    console.log('✅ Seed data created and saved');
  } catch (err: unknown) {
    console.error('❌ Global setup failed — tests will be skipped or fail individually');
    console.error(`   ${err instanceof Error ? err.message : String(err)}`);
  }
}
