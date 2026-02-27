/**
 * Credential-free unit tests for BookStackClient.
 *
 * Uses vi.stubGlobal('fetch') to mock HTTP so no BookStack instance is required.
 * These tests run in CI on all PRs, including fork PRs that lack secrets.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BookStackClient } from '../src/bookstack-client.js';

const BASE_URL = 'https://bookstack.example.com';

function makeClient(enableWrite = false) {
  return new BookStackClient({
    baseUrl: BASE_URL,
    tokenId: 'test-id',
    tokenSecret: 'test-secret',
    enableWrite,
  });
}

function mockFetch(body: unknown, status = 200) {
  const json = JSON.stringify(body);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
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

// ─── Book enhancement ─────────────────────────────────────────────────────────

describe('getBook — enhancement', () => {
  it('generates a slug-based URL when slug is present', async () => {
    mockFetch({
      id: 1,
      name: 'Test Book',
      slug: 'test-book',
      description: 'A description',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    });
    const client = makeClient();
    const result = await client.getBook(1) as Record<string, string>;
    expect(result.url).toBe(`${BASE_URL}/books/test-book`);
    expect(result.direct_link).toContain('test-book');
  });

  it('falls back to ID when slug is missing', async () => {
    mockFetch({
      id: 42,
      name: 'No Slug Book',
      slug: '',
      description: '',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
    const client = makeClient();
    const result = await client.getBook(42) as Record<string, string | number>;
    expect(result.url).toBe(`${BASE_URL}/books/42`);
  });

  it('truncates description summary at 100 chars', async () => {
    const longDesc = 'A'.repeat(150);
    mockFetch({
      id: 1,
      name: 'Book',
      slug: 'book',
      description: longDesc,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
    const client = makeClient();
    const result = await client.getBook(1) as Record<string, string>;
    expect(result.summary.length).toBeLessThanOrEqual(103); // 100 + '...'
    expect(result.summary).toMatch(/\.\.\.$/);
  });

  it('returns friendly date fields', async () => {
    mockFetch({
      id: 1,
      name: 'Book',
      slug: 'book',
      description: '',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
    const client = makeClient();
    const result = await client.getBook(1) as Record<string, string>;
    expect(result).toHaveProperty('last_updated_friendly');
    expect(result).toHaveProperty('created_friendly');
    expect(typeof result.last_updated_friendly).toBe('string');
  });
});

// ─── Page enhancement ─────────────────────────────────────────────────────────

describe('getPage — enhancement', () => {
  function mockPageWithBook(bookSlug: string) {
    // getPage calls getBookSlug which calls GET /books/{id}
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          text: () =>
            Promise.resolve(
              JSON.stringify({
                id: 10,
                name: 'Test Page',
                slug: 'test-page',
                book_id: 5,
                chapter_id: 0,
                text: 'hello world this is a test page',
                html: '<p>hello world</p>',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-02T00:00:00Z',
              })
            ),
        })
        // second fetch: getBookSlug → GET /books/5
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          text: () =>
            Promise.resolve(
              JSON.stringify({
                id: 5,
                name: 'Parent Book',
                slug: bookSlug,
                description: '',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              })
            ),
        })
    );
  }

  it('builds page URL using book slug', async () => {
    mockPageWithBook('parent-book');
    const client = makeClient();
    const result = await client.getPage(10) as Record<string, string>;
    expect(result.url).toBe(`${BASE_URL}/books/parent-book/page/test-page`);
  });

  it('computes word_count from text field', async () => {
    mockPageWithBook('parent-book');
    const client = makeClient();
    const result = await client.getPage(10) as Record<string, number | string>;
    // 'hello world this is a test page' → 7 words
    expect(result.word_count).toBe(7);
  });

  it('truncates content_preview at 200 chars', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          text: () =>
            Promise.resolve(
              JSON.stringify({
                id: 11,
                name: 'Long Page',
                slug: 'long-page',
                book_id: 5,
                chapter_id: 0,
                text: 'word '.repeat(60),
                html: '',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              })
            ),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          text: () =>
            Promise.resolve(
              JSON.stringify({ id: 5, name: 'Book', slug: 'book', description: '', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' })
            ),
        })
    );
    const client = makeClient();
    const result = await client.getPage(11) as Record<string, string>;
    expect(result.content_preview.length).toBeLessThanOrEqual(203); // 200 + '...'
    expect(result.content_preview).toMatch(/\.\.\.$/);
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe('error handling', () => {
  it('propagates HTTP status on API error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify({ message: 'Not found' })),
      })
    );
    const client = makeClient();
    await expect(client.getBook(999)).rejects.toMatchObject({
      message: 'Not found',
      status: 404,
    });
  });

  it('includes response data on API error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify({ message: 'Forbidden' })),
      })
    );
    const client = makeClient();
    await expect(client.getBook(1)).rejects.toMatchObject({
      status: 403,
      response: { status: 403 },
    });
  });
});

// ─── Write gate ───────────────────────────────────────────────────────────────

describe('write gate', () => {
  it('throws when enableWrite is false', async () => {
    const client = makeClient(false);
    await expect(
      client.createBook({ name: 'Test' })
    ).rejects.toThrow('Write operations are disabled');
  });

  it('proceeds when enableWrite is true', async () => {
    mockFetch({
      id: 99,
      name: 'New Book',
      slug: 'new-book',
      description: '',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
    const client = makeClient(true);
    const result = await client.createBook({ name: 'New Book' }) as Record<string, unknown>;
    expect(result.id).toBe(99);
  });
});

// ─── 429 retry ────────────────────────────────────────────────────────────────

describe('429 retry', () => {
  it('retries on 429 and succeeds on the next attempt', async () => {
    const mockFn = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { get: (h: string) => h === 'retry-after' ? '1' : 'application/json' },
        text: () => Promise.resolve('{"message":"Too Many Attempts."}'),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify({
          id: 1, name: 'Book', slug: 'book', description: '',
          created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
        })),
      });
    vi.stubGlobal('fetch', mockFn);

    const client = makeClient();
    const resultPromise = client.getBook(1);
    await vi.advanceTimersByTimeAsync(1_500);
    const result = await resultPromise as Record<string, unknown>;

    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ id: 1 });
  });

  it('throws after exhausting all retries on persistent 429', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: { get: (h: string) => h === 'retry-after' ? '1' : 'application/json' },
        text: () => Promise.resolve('{"message":"Too Many Attempts."}'),
      })
    );

    const client = makeClient();
    const resultPromise = client.getBook(1);
    // Attach the rejection handler before advancing timers to avoid
    // an unhandled-rejection warning while retries are in flight.
    const assertion = expect(resultPromise).rejects.toMatchObject({ status: 429 });
    // 3 retries × 1s delay each — advance past all of them
    await vi.advanceTimersByTimeAsync(4_000);
    await assertion;
  });
});
