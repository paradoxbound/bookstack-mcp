/**
 * Credential-free unit tests for all BookStackClient API methods.
 * Uses vi.stubGlobal('fetch') — no live BookStack instance needed.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BookStackClient } from '../src/bookstack-client.js';

const BASE = 'https://bs.example.com';
const readClient = new BookStackClient({ baseUrl: BASE, tokenId: 'id', tokenSecret: 'sec' });
const writeClient = new BookStackClient({ baseUrl: BASE, tokenId: 'id', tokenSecret: 'sec', enableWrite: true });

// Re-create clients each test to flush slug/page info caches
let rc: BookStackClient;
let wc: BookStackClient;

function makeFetch(data: unknown, opts: { status?: number; contentType?: string } = {}) {
  const status = opts.status ?? 200;
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h === 'content-type' ? (opts.contentType ?? 'application/json') : null) },
    text: () => Promise.resolve(body),
  });
}

/** Returns a fetch mock that cycles through a list of responses on successive calls */
function makeFetchSequence(responses: Array<{ data: unknown; status?: number; contentType?: string }>) {
  let callIndex = 0;
  return vi.fn().mockImplementation(() => {
    const r = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    const status = r.status ?? 200;
    const body = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (h: string) => (h === 'content-type' ? (r.contentType ?? 'application/json') : null) },
      text: () => Promise.resolve(body),
    });
  });
}

const NOW = new Date('2025-06-01T12:00:00Z').getTime();

function hoursAgo(h: number) {
  return new Date(NOW - h * 60 * 60 * 1000).toISOString();
}

function daysAgo(d: number) {
  return new Date(NOW - d * 24 * 60 * 60 * 1000).toISOString();
}

function weeksAgo(w: number) {
  return daysAgo(w * 7);
}

const BOOK = { id: 1, name: 'My Book', slug: 'my-book', description: 'Desc', created_at: hoursAgo(2), updated_at: hoursAgo(1) };
const PAGE = { id: 10, name: 'My Page', slug: 'my-page', book_id: 1, chapter_id: null, html: '<p>hi</p>', markdown: 'hi', text: 'hi there', created_at: hoursAgo(3), updated_at: hoursAgo(2) };
const CHAPTER = { id: 20, name: 'My Chapter', slug: 'my-chapter', book_id: 1, description: 'Chapter desc', created_at: hoursAgo(4), updated_at: hoursAgo(3) };
const SHELF = { id: 30, name: 'My Shelf', slug: 'my-shelf', description: 'Shelf desc', books: [], tags: [], created_at: hoursAgo(5), updated_at: hoursAgo(4) };
const ATTACHMENT = { id: 40, name: 'file.pdf', extension: 'pdf', uploaded_to: 10, external: false, created_at: hoursAgo(1), updated_at: hoursAgo(1) };
const COMMENT = { id: 50, commentable_id: 10, html: '<p>comment</p>', local_id: 1, parent_id: null, archived: false, created_at: hoursAgo(1), updated_at: hoursAgo(1) };
const USER = { id: 60, name: 'Alice', email: 'alice@example.com', slug: 'alice', profile_url: `${BASE}/user/alice`, created_at: hoursAgo(100), updated_at: hoursAgo(10) };
const AUDIT = { id: 70, type: 'page_create', detail: '', user_id: 60, ip: '127.0.0.1', created_at: hoursAgo(1) };
const IMAGE = { id: 80, name: 'img.png', url: `${BASE}/uploads/img.png`, path: '/uploads/img.png', type: 'gallery', uploaded_to: 10, created_at: hoursAgo(1), updated_at: hoursAgo(1) };
const RECYCLE = { id: 90, deleted_by: 60, deletable_type: 'page', deletable_id: 10, deletable: PAGE, created_at: hoursAgo(1) };
const SYSTEM = { version: '24.5.1', instance_id: 'abc', app_name: 'BookStack', base_url: BASE };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  rc = new BookStackClient({ baseUrl: BASE, tokenId: 'id', tokenSecret: 'sec' });
  wc = new BookStackClient({ baseUrl: BASE, tokenId: 'id', tokenSecret: 'sec', enableWrite: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Read — list endpoints
// ---------------------------------------------------------------------------

describe('getBooks', () => {
  it('returns enhanced books list', async () => {
    vi.stubGlobal('fetch', makeFetch({ data: [BOOK], total: 1 }));
    const result = await rc.getBooks();
    expect(result.total).toBe(1);
    expect(result.data[0].url).toContain('/books/my-book');
    expect(result.data[0].direct_link).toContain('[My Book]');
  });

  it('passes sort and filter params', async () => {
    const fetchMock = makeFetch({ data: [], total: 0 });
    vi.stubGlobal('fetch', fetchMock);
    await rc.getBooks({ sort: 'name', filter: { name: 'test' } });
    const url = (fetchMock.mock.calls[0] as [string])[0];
    expect(url).toContain('sort=name');
    expect(url).toContain('filter%5Bname%5D=test');
  });
});

describe('getPages', () => {
  it('returns enhanced pages list', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchSequence([
        { data: { data: [PAGE], total: 1 } }, // getPages
        { data: BOOK },                         // getBook for slug (enhancePageResponse)
      ])
    );
    const result = await rc.getPages({ bookId: 1 });
    expect(result.total).toBe(1);
    expect(result.data[0].url).toContain('/books/my-book/page/my-page');
  });
});

describe('getChapters', () => {
  it('returns enhanced chapters list', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchSequence([
        { data: { data: [CHAPTER], total: 1 } },
        { data: BOOK },
      ])
    );
    const result = await rc.getChapters(1);
    expect(result.total).toBe(1);
    expect(result.data[0].url).toContain('/books/my-book/chapter/my-chapter');
  });
});

describe('getShelves', () => {
  it('returns enhanced shelves list', async () => {
    vi.stubGlobal('fetch', makeFetch({ data: [SHELF], total: 1 }));
    const result = await rc.getShelves();
    expect(result.total).toBe(1);
    expect(result.data[0].url).toContain('/shelves/my-shelf');
  });

  it('passes sort and filter params', async () => {
    const fetchMock = makeFetch({ data: [], total: 0 });
    vi.stubGlobal('fetch', fetchMock);
    await rc.getShelves({ sort: 'name', filter: { name: 'test' } });
    const url = (fetchMock.mock.calls[0] as [string])[0];
    expect(url).toContain('sort=name');
    expect(url).toContain('filter%5Bname%5D=test');
  });
});

describe('getAttachments', () => {
  it('returns enhanced attachments list with page URL', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchSequence([
        { data: { data: [ATTACHMENT], total: 1 } }, // getAttachments
        { data: PAGE },                               // getPage (for generatePageUrlFromId)
        { data: BOOK },                               // getBook (for slug)
      ])
    );
    const result = await rc.getAttachments();
    expect(result.total).toBe(1);
    expect(result.data[0].direct_link).toContain('[file.pdf]');
    expect(result.data[0].page_url).toContain('/books/');
  });
});

describe('getComments', () => {
  it('returns comments list', async () => {
    vi.stubGlobal('fetch', makeFetch({ data: [COMMENT], total: 1 }));
    const result = await rc.getComments({ page_id: 10 });
    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe(50);
  });
});

describe('getUsers', () => {
  it('returns users list', async () => {
    vi.stubGlobal('fetch', makeFetch({ data: [USER], total: 1 }));
    const result = await rc.getUsers();
    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe(60);
  });

  it('passes sort and filter params', async () => {
    const fetchMock = makeFetch({ data: [], total: 0 });
    vi.stubGlobal('fetch', fetchMock);
    await rc.getUsers({ sort: 'name', filter: { name: 'alice' } });
    const url = (fetchMock.mock.calls[0] as [string])[0];
    expect(url).toContain('sort=name');
  });
});

describe('getAuditLog', () => {
  it('returns audit log entries', async () => {
    vi.stubGlobal('fetch', makeFetch({ data: [AUDIT], total: 1 }));
    const result = await rc.getAuditLog();
    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe(70);
  });

  it('passes sort and filter params', async () => {
    const fetchMock = makeFetch({ data: [], total: 0 });
    vi.stubGlobal('fetch', fetchMock);
    await rc.getAuditLog({ sort: 'created_at', filter: { type: 'page_create' } });
    const url = (fetchMock.mock.calls[0] as [string])[0];
    expect(url).toContain('sort=created_at');
  });
});

describe('getImageGallery', () => {
  it('returns image gallery entries', async () => {
    vi.stubGlobal('fetch', makeFetch({ data: [IMAGE], total: 1 }));
    const result = await rc.getImageGallery();
    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe(80);
  });
});

describe('getRecycleBin', () => {
  it('returns recycle bin entries', async () => {
    vi.stubGlobal('fetch', makeFetch({ data: [RECYCLE], total: 1 }));
    const result = await rc.getRecycleBin();
    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe(90);
  });
});

// ---------------------------------------------------------------------------
// Read — single item endpoints
// ---------------------------------------------------------------------------

describe('getChapter', () => {
  it('returns enhanced chapter', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchSequence([{ data: CHAPTER }, { data: BOOK }])
    );
    const result = await rc.getChapter(20);
    expect(result.url).toContain('/books/my-book/chapter/my-chapter');
    expect(result.location).toBe('In Book ID 1');
  });
});

describe('getShelf', () => {
  it('returns enhanced shelf', async () => {
    vi.stubGlobal('fetch', makeFetch(SHELF));
    const result = await rc.getShelf(30);
    expect(result.url).toContain('/shelves/my-shelf');
    expect(result.book_count).toBe(0);
  });
});

describe('getAttachment', () => {
  it('returns enhanced attachment with download URL', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchSequence([{ data: ATTACHMENT }, { data: PAGE }, { data: BOOK }])
    );
    const result = await rc.getAttachment(40);
    expect(result.download_url).toContain('/attachments/40');
    expect(result.direct_link).toContain('[file.pdf]');
  });
});

describe('getComment', () => {
  it('returns a comment', async () => {
    vi.stubGlobal('fetch', makeFetch(COMMENT));
    const result = await rc.getComment(50);
    expect(result.id).toBe(50);
  });
});

describe('getUser', () => {
  it('returns a user', async () => {
    vi.stubGlobal('fetch', makeFetch(USER));
    const result = await rc.getUser(60);
    expect(result.id).toBe(60);
    expect(result.name).toBe('Alice');
  });
});

describe('getImage', () => {
  it('returns an image gallery entry', async () => {
    vi.stubGlobal('fetch', makeFetch(IMAGE));
    const result = await rc.getImage(80);
    expect(result.id).toBe(80);
  });
});

describe('getSystemInfo', () => {
  it('returns system info', async () => {
    vi.stubGlobal('fetch', makeFetch(SYSTEM));
    const result = await rc.getSystemInfo();
    expect(result.version).toBe('24.5.1');
  });
});

// ---------------------------------------------------------------------------
// Search / recent changes
// ---------------------------------------------------------------------------

const SEARCH_RESULTS = {
  data: [
    { id: 1, type: 'book', name: 'My Book', slug: 'my-book', preview_content: { content: 'preview text' }, created_at: hoursAgo(2), updated_at: hoursAgo(1) },
    { id: 10, type: 'page', name: 'My Page', slug: 'my-page', book_id: 1, preview_content: { content: 'page preview' }, created_at: hoursAgo(3), updated_at: hoursAgo(2) },
    { id: 20, type: 'chapter', name: 'My Chapter', slug: 'my-chapter', book_id: 1, preview_content: null, created_at: hoursAgo(4), updated_at: hoursAgo(3) },
    { id: 30, type: 'bookshelf', name: 'My Shelf', slug: 'my-shelf', preview_content: null, created_at: hoursAgo(5), updated_at: hoursAgo(4) },
    { id: 99, type: 'unknown', name: 'Thing', slug: 'thing', preview_content: null, created_at: hoursAgo(1), updated_at: hoursAgo(1) },
  ],
};

describe('searchContent', () => {
  it('returns enhanced search results', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchSequence([
        { data: SEARCH_RESULTS },
        { data: BOOK }, // getBook slug for page result
        { data: BOOK }, // getBook slug for chapter result
      ])
    );
    const result = await rc.searchContent('my query');
    expect(result.search_query).toBe('my query');
    expect((result.results as unknown[]).length).toBe(5);
  });

  it('applies type filter to query', async () => {
    const fetchMock = makeFetch(SEARCH_RESULTS);
    vi.stubGlobal('fetch', fetchMock);
    await rc.searchContent('docs', { type: 'page', count: 10 });
    const url = (fetchMock.mock.calls[0] as [string])[0];
    expect(url).toContain('query=%7Btype%3Apage%7D');
    expect(url).toContain('count=10');
  });

  it('applies offset param', async () => {
    const fetchMock = makeFetch({ data: [] });
    vi.stubGlobal('fetch', fetchMock);
    await rc.searchContent('x', { offset: 20 });
    const url = (fetchMock.mock.calls[0] as [string])[0];
    expect(url).toContain('offset=20');
  });
});

describe('searchPages', () => {
  it('returns page search results', async () => {
    vi.stubGlobal('fetch', makeFetchSequence([{ data: { data: [] } }]));
    const result = await rc.searchPages('test', { bookId: 1, count: 5 });
    expect(result.search_query).toBe('test');
    expect(result.results).toBeDefined();
  });

  it('applies bookId filter', async () => {
    const fetchMock = makeFetch({ data: [] });
    vi.stubGlobal('fetch', fetchMock);
    await rc.searchPages('q', { bookId: 5 });
    const url = (fetchMock.mock.calls[0] as [string])[0];
    expect(url).toContain('book_id%3A5');
  });
});

describe('getRecentChanges', () => {
  it('returns recent changes (bookshelf type avoids per-result fetch)', async () => {
    const shelfResult = {
      data: [
        { id: 30, type: 'bookshelf', name: 'My Shelf', slug: 'my-shelf', preview_content: null, created_at: hoursAgo(1), updated_at: hoursAgo(1) },
      ],
    };
    vi.stubGlobal('fetch', makeFetch(shelfResult));
    const result = await rc.getRecentChanges({ type: 'all', limit: 5, days: 7 });
    expect(result.total_found).toBe(1);
    expect((result.results as unknown[]).length).toBe(1);
  });

  it('fetches full page detail for page results', async () => {
    const pageResult = {
      data: [{ id: 10, type: 'page', name: 'My Page', slug: 'my-page', book_id: 1, preview_content: null, created_at: hoursAgo(1), updated_at: hoursAgo(1) }],
    };
    const fullPage = { ...PAGE, book: { name: 'My Book' }, chapter: null };
    vi.stubGlobal(
      'fetch',
      makeFetchSequence([
        { data: pageResult },           // search
        { data: fullPage },             // GET /pages/10
        { data: BOOK },                 // getBook for URL
      ])
    );
    const result = await rc.getRecentChanges({ type: 'page' });
    expect(result.total_found).toBe(1);
  });

  it('fetches full book detail for book results', async () => {
    const bookResult = {
      data: [{ id: 1, type: 'book', name: 'My Book', slug: 'my-book', preview_content: null, created_at: hoursAgo(1), updated_at: hoursAgo(1) }],
    };
    const fullBook = { ...BOOK, page_count: 5 };
    vi.stubGlobal(
      'fetch',
      makeFetchSequence([
        { data: bookResult },  // search
        { data: fullBook },    // GET /books/1
      ])
    );
    const result = await rc.getRecentChanges({ type: 'book' });
    expect(result.total_found).toBe(1);
  });

  it('fetches full chapter detail for chapter results', async () => {
    const chapterResult = {
      data: [{ id: 20, type: 'chapter', name: 'My Chapter', slug: 'my-chapter', book_id: 1, preview_content: null, created_at: hoursAgo(1), updated_at: hoursAgo(1) }],
    };
    const fullChapter = { ...CHAPTER, book: { name: 'My Book' } };
    vi.stubGlobal(
      'fetch',
      makeFetchSequence([
        { data: chapterResult }, // search
        { data: fullChapter },   // GET /chapters/20
        { data: BOOK },          // getBook for URL
      ])
    );
    const result = await rc.getRecentChanges({ type: 'chapter' });
    expect(result.total_found).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Export methods
// ---------------------------------------------------------------------------

describe('exportPage', () => {
  it('returns text for html format', async () => {
    vi.stubGlobal('fetch', makeFetch('<h1>Page</h1>', { contentType: 'text/html' }));
    const result = await rc.exportPage(10, 'html');
    expect(typeof result).toBe('string');
    expect(result).toContain('<h1>');
  });

  it('returns text for markdown format', async () => {
    vi.stubGlobal('fetch', makeFetch('# Page', { contentType: 'text/plain' }));
    const result = await rc.exportPage(10, 'markdown');
    expect(result).toBe('# Page');
  });

  it('returns text for plaintext format', async () => {
    vi.stubGlobal('fetch', makeFetch('plain text', { contentType: 'text/plain' }));
    const result = await rc.exportPage(10, 'plaintext');
    expect(result).toBe('plain text');
  });

  it('returns download metadata for pdf format', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchSequence([
        { data: PAGE },  // getPage
        { data: BOOK },  // getBook for slug (inside getPage)
        { data: BOOK },  // getBook for export URL
      ])
    );
    const result = await rc.exportPage(10, 'pdf') as Record<string, unknown>;
    expect(result.download_url).toContain('/export/pdf');
    expect(result.format).toBe('pdf');
  });

  it('returns download metadata for zip format', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchSequence([
        { data: PAGE },
        { data: BOOK },
        { data: BOOK },
      ])
    );
    const result = await rc.exportPage(10, 'zip') as Record<string, unknown>;
    expect(result.format).toBe('zip');
    expect(result.content_type).toBe('application/zip');
  });

  it('throws on empty text response', async () => {
    vi.stubGlobal('fetch', makeFetch('', { contentType: 'text/html' }));
    await expect(rc.exportPage(10, 'html')).rejects.toThrow();
  });
});

describe('exportBook', () => {
  it('returns text for markdown format', async () => {
    vi.stubGlobal('fetch', makeFetch('# Book', { contentType: 'text/plain' }));
    const result = await rc.exportBook(1, 'markdown');
    expect(result).toBe('# Book');
  });

  it('returns text for html format', async () => {
    vi.stubGlobal('fetch', makeFetch('<html/>', { contentType: 'text/html' }));
    const result = await rc.exportBook(1, 'html');
    expect(result).toBe('<html/>');
  });

  it('returns download metadata for pdf format', async () => {
    vi.stubGlobal('fetch', makeFetch(BOOK));
    const result = await rc.exportBook(1, 'pdf') as Record<string, unknown>;
    expect(result.download_url).toContain('/export/pdf');
    expect(result.book_name).toBe('My Book');
  });

  it('returns download metadata for zip format', async () => {
    vi.stubGlobal('fetch', makeFetch(BOOK));
    const result = await rc.exportBook(1, 'zip') as Record<string, unknown>;
    expect(result.content_type).toBe('application/zip');
  });

  it('throws on empty text response', async () => {
    vi.stubGlobal('fetch', makeFetch('', { contentType: 'text/plain' }));
    await expect(rc.exportBook(1, 'plaintext')).rejects.toThrow();
  });
});

describe('exportChapter', () => {
  it('returns text for html format', async () => {
    vi.stubGlobal('fetch', makeFetch('<h2>Chapter</h2>', { contentType: 'text/html' }));
    const result = await rc.exportChapter(20, 'html');
    expect(result).toContain('<h2>');
  });

  it('returns download metadata for pdf format', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchSequence([
        { data: CHAPTER },  // getChapter (which calls getBook for slug inside enhanceChapterResponse)
        { data: BOOK },     // getBook for slug in enhanceChapterResponse
        { data: BOOK },     // getBook for export URL
      ])
    );
    const result = await rc.exportChapter(20, 'pdf') as Record<string, unknown>;
    expect(result.download_url).toContain('/export/pdf');
    expect(result.chapter_name).toBe('My Chapter');
  });

  it('returns download metadata for zip format', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchSequence([
        { data: CHAPTER },
        { data: BOOK },
        { data: BOOK },
      ])
    );
    const result = await rc.exportChapter(20, 'zip') as Record<string, unknown>;
    expect(result.content_type).toBe('application/zip');
  });

  it('throws on empty text response', async () => {
    vi.stubGlobal('fetch', makeFetch('', { contentType: 'text/plain' }));
    await expect(rc.exportChapter(20, 'plaintext')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

describe('createBook', () => {
  it('creates a book and returns enhanced result', async () => {
    vi.stubGlobal('fetch', makeFetch(BOOK));
    const result = await wc.createBook({ name: 'My Book' });
    expect(result.url).toContain('/books/my-book');
  });
});

describe('updateBook', () => {
  it('updates a book and returns enhanced result', async () => {
    vi.stubGlobal('fetch', makeFetch({ ...BOOK, name: 'Updated' }));
    const result = await wc.updateBook(1, { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });
});

describe('deleteBook', () => {
  it('deletes a book without throwing', async () => {
    vi.stubGlobal('fetch', makeFetch('', { status: 204 }));
    await expect(wc.deleteBook(1)).resolves.not.toThrow();
  });
});

describe('createChapter', () => {
  it('creates a chapter and returns enhanced result', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchSequence([{ data: CHAPTER }, { data: BOOK }])
    );
    const result = await wc.createChapter({ book_id: 1, name: 'My Chapter' });
    expect(result.url).toContain('/chapter/my-chapter');
  });
});

describe('updateChapter', () => {
  it('updates a chapter and returns enhanced result', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchSequence([{ data: CHAPTER }, { data: BOOK }])
    );
    const result = await wc.updateChapter(20, { name: 'My Chapter' });
    expect(result.url).toContain('/chapter/');
  });
});

describe('deleteChapter', () => {
  it('deletes a chapter without throwing', async () => {
    vi.stubGlobal('fetch', makeFetch('', { status: 204 }));
    await expect(wc.deleteChapter(20)).resolves.not.toThrow();
  });
});

describe('createPage', () => {
  it('creates a page and returns enhanced result', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchSequence([{ data: PAGE }, { data: BOOK }])
    );
    const result = await wc.createPage({ name: 'My Page', book_id: 1 });
    expect(result.url).toContain('/books/my-book/page/my-page');
  });
});

describe('updatePage', () => {
  it('updates a page and returns enhanced result', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchSequence([{ data: PAGE }, { data: BOOK }])
    );
    const result = await wc.updatePage(10, { name: 'My Page' });
    expect(result.word_count).toBe(2); // "hi there"
  });
});

describe('deletePage', () => {
  it('deletes a page without throwing', async () => {
    vi.stubGlobal('fetch', makeFetch('', { status: 204 }));
    await expect(wc.deletePage(10)).resolves.not.toThrow();
  });
});

describe('createShelf', () => {
  it('creates a shelf and returns enhanced result', async () => {
    vi.stubGlobal('fetch', makeFetch(SHELF));
    const result = await wc.createShelf({ name: 'My Shelf' });
    expect(result.url).toContain('/shelves/my-shelf');
  });
});

describe('updateShelf', () => {
  it('updates a shelf and returns enhanced result', async () => {
    vi.stubGlobal('fetch', makeFetch({ ...SHELF, name: 'Updated Shelf' }));
    const result = await wc.updateShelf(30, { name: 'Updated Shelf' });
    expect(result.name).toBe('Updated Shelf');
  });
});

describe('deleteShelf', () => {
  it('deletes a shelf without throwing', async () => {
    vi.stubGlobal('fetch', makeFetch('', { status: 204 }));
    await expect(wc.deleteShelf(30)).resolves.not.toThrow();
  });
});

describe('createAttachment', () => {
  it('creates a link attachment and returns enhanced result', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchSequence([
        { data: ATTACHMENT },  // POST /attachments
        { data: PAGE },        // getPage for URL
        { data: BOOK },        // getBook for slug
      ])
    );
    const result = await wc.createAttachment({ uploaded_to: 10, name: 'file.pdf', link: 'https://example.com/file.pdf' });
    expect(result.direct_link).toContain('[file.pdf]');
  });
});

describe('updateAttachment', () => {
  it('updates an attachment and returns enhanced result', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchSequence([
        { data: ATTACHMENT },
        { data: PAGE },
        { data: BOOK },
      ])
    );
    const result = await wc.updateAttachment(40, { name: 'updated.pdf' });
    expect(result.direct_link).toBeDefined();
  });
});

describe('deleteAttachment', () => {
  it('deletes an attachment without throwing', async () => {
    vi.stubGlobal('fetch', makeFetch('', { status: 204 }));
    await expect(wc.deleteAttachment(40)).resolves.not.toThrow();
  });
});

describe('createComment', () => {
  it('creates a comment and returns it', async () => {
    vi.stubGlobal('fetch', makeFetch(COMMENT));
    const result = await wc.createComment({ page_id: 10, html: '<p>comment</p>' });
    expect(result.id).toBe(50);
  });
});

describe('updateComment', () => {
  it('updates a comment and returns it', async () => {
    vi.stubGlobal('fetch', makeFetch({ ...COMMENT, html: '<p>updated</p>' }));
    const result = await wc.updateComment(50, { html: '<p>updated</p>' });
    expect(result.html).toBe('<p>updated</p>');
  });
});

describe('deleteComment', () => {
  it('deletes a comment without throwing', async () => {
    vi.stubGlobal('fetch', makeFetch('', { status: 204 }));
    await expect(wc.deleteComment(50)).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Write gate — methods not covered by write-gate.test.ts
// ---------------------------------------------------------------------------

describe('write gate (shelves, comments, attachments)', () => {
  it('createShelf throws when write disabled', async () => {
    await expect(rc.createShelf({ name: 'x' })).rejects.toThrow('Write operations are disabled');
  });

  it('updateShelf throws when write disabled', async () => {
    await expect(rc.updateShelf(1, { name: 'x' })).rejects.toThrow('Write operations are disabled');
  });

  it('deleteShelf throws when write disabled', async () => {
    await expect(rc.deleteShelf(1)).rejects.toThrow('Write operations are disabled');
  });

  it('createComment throws when write disabled', async () => {
    await expect(rc.createComment({ page_id: 1, html: '<p>x</p>' })).rejects.toThrow('Write operations are disabled');
  });

  it('updateComment throws when write disabled', async () => {
    await expect(rc.updateComment(1, { html: '<p>x</p>' })).rejects.toThrow('Write operations are disabled');
  });

  it('deleteComment throws when write disabled', async () => {
    await expect(rc.deleteComment(1)).rejects.toThrow('Write operations are disabled');
  });

  it('createAttachment throws when write disabled', async () => {
    await expect(rc.createAttachment({ uploaded_to: 1, name: 'f', link: 'http://x' })).rejects.toThrow('Write operations are disabled');
  });

  it('updateAttachment throws when write disabled', async () => {
    await expect(rc.updateAttachment(1, { name: 'f' })).rejects.toThrow('Write operations are disabled');
  });

  it('deleteAttachment throws when write disabled', async () => {
    await expect(rc.deleteAttachment(1)).rejects.toThrow('Write operations are disabled');
  });
});

// ---------------------------------------------------------------------------
// formatDate branches (exercised via getBook)
// ---------------------------------------------------------------------------

describe('formatDate branches', () => {
  it('returns "Less than an hour ago" for very recent dates', async () => {
    const book = { ...BOOK, updated_at: hoursAgo(0.5), created_at: hoursAgo(0.5) };
    vi.stubGlobal('fetch', makeFetch(book));
    const result = await rc.getBook(1);
    expect(result.last_updated_friendly).toBe('Less than an hour ago');
  });

  it('returns "X weeks ago" for dates 2-3 weeks old', async () => {
    const book = { ...BOOK, updated_at: weeksAgo(2), created_at: weeksAgo(2) };
    vi.stubGlobal('fetch', makeFetch(book));
    const result = await rc.getBook(1);
    expect(result.last_updated_friendly).toMatch(/\d+ weeks ago/);
  });

  it('returns a locale date string for dates older than 4 weeks', async () => {
    const book = { ...BOOK, updated_at: weeksAgo(5), created_at: weeksAgo(5) };
    vi.stubGlobal('fetch', makeFetch(book));
    const result = await rc.getBook(1);
    // Should be a formatted date, not a "X ago" string
    expect(result.last_updated_friendly).not.toContain('ago');
  });

  it('returns "Unknown date" for empty date string', async () => {
    const book = { ...BOOK, updated_at: '', created_at: '' };
    vi.stubGlobal('fetch', makeFetch(book));
    const result = await rc.getBook(1);
    expect(result.last_updated_friendly).toBe('Unknown date');
  });
});

// ---------------------------------------------------------------------------
// generateContentUrl branches (exercised via searchContent)
// ---------------------------------------------------------------------------

describe('generateContentUrl branches', () => {
  it('generates book URL from type=book', async () => {
    const results = { data: [{ id: 1, type: 'book', name: 'B', slug: 'b', preview_content: null, created_at: hoursAgo(1), updated_at: hoursAgo(1) }] };
    vi.stubGlobal('fetch', makeFetch(results));
    const result = await rc.searchContent('b');
    const items = result.results as Array<{ url: string }>;
    expect(items[0].url).toContain('/books/b');
  });

  it('generates shelf URL from type=bookshelf', async () => {
    const results = { data: [{ id: 30, type: 'bookshelf', name: 'S', slug: 's', preview_content: null, created_at: hoursAgo(1), updated_at: hoursAgo(1) }] };
    vi.stubGlobal('fetch', makeFetch(results));
    const result = await rc.searchContent('s');
    const items = result.results as Array<{ url: string }>;
    expect(items[0].url).toContain('/shelves/s');
  });

  it('generates chapter URL with book_id', async () => {
    const results = {
      data: [{ id: 20, type: 'chapter', name: 'C', slug: 'c', book_id: 1, preview_content: null, created_at: hoursAgo(1), updated_at: hoursAgo(1) }],
    };
    vi.stubGlobal(
      'fetch',
      makeFetchSequence([{ data: results }, { data: BOOK }])
    );
    const result = await rc.searchContent('c');
    const items = result.results as Array<{ url: string }>;
    expect(items[0].url).toContain('/books/my-book/chapter/c');
  });

  it('generates fallback link URL for page without book_id', async () => {
    const results = {
      data: [{ id: 10, type: 'page', name: 'P', slug: 'p', book_id: null, preview_content: null, created_at: hoursAgo(1), updated_at: hoursAgo(1) }],
    };
    vi.stubGlobal('fetch', makeFetch(results));
    const result = await rc.searchContent('p');
    const items = result.results as Array<{ url: string }>;
    expect(items[0].url).toContain('/link/10');
  });

  it('generates fallback link URL for chapter without book_id', async () => {
    const results = {
      data: [{ id: 20, type: 'chapter', name: 'C', slug: 'c', book_id: null, preview_content: null, created_at: hoursAgo(1), updated_at: hoursAgo(1) }],
    };
    vi.stubGlobal('fetch', makeFetch(results));
    const result = await rc.searchContent('c');
    const items = result.results as Array<{ url: string }>;
    expect(items[0].url).toContain('/link/20');
  });

  it('generates fallback link URL for unknown type', async () => {
    const results = {
      data: [{ id: 99, type: 'unknown', name: 'U', slug: 'u', preview_content: null, created_at: hoursAgo(1), updated_at: hoursAgo(1) }],
    };
    vi.stubGlobal('fetch', makeFetch(results));
    const result = await rc.searchContent('u');
    const items = result.results as Array<{ url: string }>;
    expect(items[0].url).toContain('/link/99');
  });
});

// ---------------------------------------------------------------------------
// getBookSlug cache and error fallback
// ---------------------------------------------------------------------------

describe('getBookSlug', () => {
  it('falls back to string ID when book fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchSequence([
        { data: PAGE },                                    // getPage
        { data: 'Not found', status: 404 },               // getBook fails for slug lookup
      ])
    );
    // When book slug lookup fails, URL falls back to numeric ID
    const result = await rc.getPage(10);
    expect(result.url).toMatch(/\/books\/\d+\/page\/my-page/);
  });

  it('caches book slug across multiple calls', async () => {
    const fetchMock = makeFetchSequence([
      { data: { data: [{ ...PAGE, id: 11, slug: 'p1', book_id: 1 }], total: 1 } }, // getPages
      { data: BOOK },  // getBook (first time)
      { data: { data: [{ ...PAGE, id: 12, slug: 'p2', book_id: 1 }], total: 1 } }, // getPages again
      // getBook should NOT be called again (cache hit)
    ]);
    vi.stubGlobal('fetch', fetchMock);
    // Fresh client to ensure empty cache
    const freshClient = new BookStackClient({ baseUrl: BASE, tokenId: 'id', tokenSecret: 'sec' });
    await freshClient.getPages({ bookId: 1 });
    await freshClient.getPages({ bookId: 1 });
    // Only 3 fetch calls: getPages, getBook (once), getPages again — not 4
    expect(fetchMock.mock.calls.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Shelf with books (enhanceShelfResponse nested enhancement)
// ---------------------------------------------------------------------------

describe('getShelf with nested books', () => {
  it('enhances nested books inside shelf', async () => {
    const shelfWithBooks = { ...SHELF, books: [BOOK], tags: [{ name: 'env', value: 'prod' }] };
    vi.stubGlobal('fetch', makeFetch(shelfWithBooks));
    const result = await rc.getShelf(30);
    const books = result.books as Array<{ url: string }>;
    expect(books[0].url).toContain('/books/my-book');
    expect(result.book_count).toBe(1);
    expect(result.tags_summary).toContain('env=prod');
  });
});

// ---------------------------------------------------------------------------
// request() — error and response handling branches
// ---------------------------------------------------------------------------

describe('request error handling', () => {
  it('parses JSON error message from API response', async () => {
    vi.stubGlobal('fetch', makeFetch({ message: 'Not found' }, { status: 404 }));
    await expect(rc.getBook(999)).rejects.toMatchObject({ message: 'Not found', status: 404 });
  });

  it('falls back to raw text when error body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: { get: () => 'text/plain' },
        text: () => Promise.resolve('Internal Server Error'),
      })
    );
    await expect(rc.getBook(1)).rejects.toMatchObject({ message: 'Internal Server Error', status: 500 });
  });

  it('returns text directly for non-JSON content type', async () => {
    vi.stubGlobal('fetch', makeFetch('<html/>', { contentType: 'text/html' }));
    const result = await rc.exportBook(1, 'html');
    expect(result).toBe('<html/>');
  });

  it('returns undefined for 204 No Content response', async () => {
    vi.stubGlobal('fetch', makeFetch('', { status: 204 }));
    const result = await wc.deleteBook(1);
    expect(result).toBeUndefined();
  });
});
