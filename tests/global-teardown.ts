import { BookStackClient } from '../src/bookstack-client.js';
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

  // Delete in reverse dependency order: comment -> attachment -> page -> chapter -> shelf -> book
  const deletions: Array<{ label: string; fn: () => Promise<any> }> = [
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
      console.log(`   Deleted ${label} (id=${(seed as any)[label + 'Id']})`);
    } catch (err: any) {
      // 404 means it was already cleaned up by a test — that's fine
      if (err?.response?.status === 404) {
        console.log(`   ${label} already gone (404)`);
      } else {
        console.warn(`   ⚠ Failed to delete ${label}:`, err?.message || err);
      }
    }
  }

  cleanupSeedFile();
  console.log('✅ Teardown complete');
}
