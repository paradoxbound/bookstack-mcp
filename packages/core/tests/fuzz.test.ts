/**
 * Property-based fuzz tests for BookStackClient response enhancement.
 *
 * Uses fast-check to generate arbitrary API responses and verify that
 * the enhance* methods never throw regardless of input shape.
 * These run credential-free (fetch is mocked) alongside the unit tests.
 */
import { describe, vi, beforeEach, afterEach } from 'vitest';
import { it } from '@fast-check/vitest';
import * as fc from 'fast-check';
import { BookStackClient } from '../src/bookstack-client.js';

const BASE_URL = 'https://bookstack.example.com';

function makeClient() {
  return new BookStackClient({
    baseUrl: BASE_URL,
    tokenId: 'test-id',
    tokenSecret: 'test-secret',
  });
}

function mockFetchWith(body: unknown) {
  const json = JSON.stringify(body);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(json),
      json: () => Promise.resolve(body),
    })
  );
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// Arbitrary for optional string fields (null, undefined, empty, or any string)
const optString = fc.option(fc.string(), { nil: undefined });
const optNullString = fc.option(fc.string(), { nil: null });

const arbitraryBook = fc.record({
  id: fc.integer(),
  name: fc.string(),
  slug: optString,
  description: optNullString,
  created_at: optString,
  updated_at: optString,
});

const arbitraryPage = fc.record({
  id: fc.integer(),
  name: fc.string(),
  slug: optString,
  book_id: fc.integer(),
  chapter_id: fc.option(fc.integer(), { nil: undefined }),
  text: optNullString,
  created_at: optString,
  updated_at: optString,
});

const arbitraryChapter = fc.record({
  id: fc.integer(),
  name: fc.string(),
  slug: optString,
  book_id: fc.integer(),
  description: optNullString,
  created_at: optString,
  updated_at: optString,
});

const arbitraryShelf = fc.record({
  id: fc.integer(),
  name: fc.string(),
  slug: optString,
  description: optNullString,
  created_at: optString,
  updated_at: optString,
  books: fc.option(fc.array(arbitraryBook), { nil: undefined }),
  tags: fc.option(
    fc.array(fc.record({ name: fc.string(), value: optString })),
    { nil: undefined }
  ),
});

describe('BookStackClient property-based fuzz tests', () => {
  it.prop([arbitraryBook])(
    'enhances book responses without throwing',
    async (fakeBook) => {
      mockFetchWith(fakeBook);
      const client = makeClient();
      await client.getBook(1);
    }
  );

  it.prop([arbitraryPage])(
    'enhances page responses without throwing',
    async (fakePage) => {
      mockFetchWith(fakePage);
      const client = makeClient();
      await client.getPage(1);
    }
  );

  it.prop([arbitraryChapter])(
    'enhances chapter responses without throwing',
    async (fakeChapter) => {
      mockFetchWith(fakeChapter);
      const client = makeClient();
      await client.getChapter(1);
    }
  );

  it.prop([arbitraryShelf])(
    'enhances shelf responses without throwing',
    async (fakeShelf) => {
      mockFetchWith(fakeShelf);
      const client = makeClient();
      await client.getShelf(1);
    }
  );
});
