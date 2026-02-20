import { BookStackClient } from '@bookstack-mcp/core';
import {
  getTestConfig,
  hasTestCredentials,
  loadSeedData,
  cleanupSeedFile,
} from './helpers.js';

export default async function globalTeardown() {
  if (!hasTestCredentials()) {
    return;
  }

  console.log('🧹 Cleaning up seed data…');

  const client = new BookStackClient(getTestConfig(true));

  const seed = loadSeedData();
  if (!seed) {
    console.log('   No seed data file found — nothing to clean up');
    return;
  }

  const errStatus = (err: unknown): number | undefined =>
    (err as { response?: { status?: number } })?.response?.status;

  // Delete in reverse dependency order: comment -> attachment -> page -> chapter -> shelf -> book
  const deletions: Array<{ label: string; fn: () => Promise<unknown> }> = [
    { label: 'comment', fn: () => client.deleteComment(seed.commentId) },
    { label: 'attachment', fn: () => client.deleteAttachment(seed.attachmentId) },
    { label: 'page', fn: () => client.deletePage(seed.pageId) },
    { label: 'chapter', fn: () => client.deleteChapter(seed.chapterId) },
    { label: 'shelf', fn: () => client.deleteShelf(seed.shelfId) },
    { label: 'book', fn: () => client.deleteBook(seed.bookId) },
  ];

  for (const { label, fn } of deletions) {
    try {
      await fn();
      console.log(`   Deleted ${label} (id=${(seed as Record<string, number>)[label + 'Id']})`);
    } catch (err: unknown) {
      if (errStatus(err) === 404) {
        console.log(`   ${label} already gone (404)`);
      } else {
        console.warn(`   ⚠ Failed to delete ${label}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  cleanupSeedFile();
  console.log('✅ Teardown complete');
}
