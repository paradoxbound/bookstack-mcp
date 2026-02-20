import { describe, test, expect } from 'vitest';
import {
  createWriteClient,
  createReadOnlyClient,
  hasTestCredentials,
  hasSeedData,
  loadSeedData,
} from './helpers.js';

const canRun = () => hasTestCredentials() && hasSeedData();

describe('Write gate', () => {
  test.skipIf(!canRun())(
    'BOOKSTACK_ENABLE_WRITE=false rejects write operations',
    async () => {
      const readOnlyClient = createReadOnlyClient();
      const seed = loadSeedData()!;

      await expect(
        readOnlyClient.createPage({
          name: 'Should Not Exist',
          book_id: seed.bookId,
          html: '<p>gate test</p>',
        }),
      ).rejects.toThrow('Write operations are disabled');
    },
  );

  test.skipIf(!canRun())(
    'BOOKSTACK_ENABLE_WRITE=true allows write operations',
    async () => {
      const writeClient = createWriteClient();
      const seed = loadSeedData()!;

      let pageId: number | undefined;
      try {
        const page = await writeClient.createPage({
          name: 'Write Gate Test Page',
          book_id: seed.bookId,
          html: '<p>gate test success</p>',
        });
        pageId = page.id;
        expect(page.id).toBeGreaterThan(0);
        expect(page.name).toBe('Write Gate Test Page');
      } finally {
        if (pageId) await writeClient.deletePage(pageId);
      }
    },
  );
});
