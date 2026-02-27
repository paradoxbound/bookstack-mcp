export * from './types.js';
import type {
  BookStackConfig,
  Book,
  Page,
  Chapter,
  Shelf,
  Tag,
  Attachment,
  SearchResult,
  ListResponse,
  AuditLogEntry,
  SystemInfo,
  User,
  RecycleBinEntry,
  ImageGalleryEntry,
  Comment,
} from './types.js';
import fs from 'node:fs';
import path from 'node:path';

export class BookStackClient {
  private readonly baseUrl: string;
  private readonly tokenId: string;
  private readonly tokenSecret: string;
  private readonly enableWrite: boolean;
  private bookSlugCache: Map<number, string> = new Map();
  private pageInfoCache: Map<number, { slug: string; bookId: number }> = new Map();

  constructor(config: BookStackConfig) {
    this.baseUrl = config.baseUrl;
    this.tokenId = config.tokenId;
    this.tokenSecret = config.tokenSecret;
    this.enableWrite = config.enableWrite ?? false;
  }

  private async request<T>(
    method: string,
    path: string,
    params?: Record<string, string | number | undefined>,
    body?: unknown,
    options?: { timeout?: number; returnText?: boolean; _retries?: number }
  ): Promise<T> {
    let url = `${this.baseUrl}/api${path}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params)
        .filter(([, v]) => v != null)
        .forEach(([k, v]) => searchParams.set(k, String(v)));
      url += '?' + searchParams.toString();
    }
    const headers: Record<string, string> = {
      Authorization: `Token ${this.tokenId}:${this.tokenSecret}`,
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    const requestBody = body !== undefined ? JSON.stringify(body) : undefined;
    const timeout = options?.timeout ?? 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, {
      method,
      headers,
      body: requestBody,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.status === 429) {
      const retriesLeft = options?._retries ?? 3;
      if (retriesLeft > 0) {
        const retryAfter = parseInt(res.headers.get('retry-after') ?? '10', 10);
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return this.request(method, path, params, body, { ...options, _retries: retriesLeft - 1 });
      }
    }
    if (!res.ok) {
      const text = await res.text();
      let message = text;
      try {
        const parsed = JSON.parse(text) as { message?: string };
        if (parsed.message) message = parsed.message;
      } catch {
        // ignore
      }
      const err = new Error(message) as Error & {
        status?: number;
        response?: { status: number; data: string };
      };
      err.status = res.status;
      err.response = { status: res.status, data: text };
      throw err;
    }
    if (options?.returnText) {
      return (await res.text()) as T;
    }
    const contentType = res.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      return (await res.text()) as T;
    }
    const text = await res.text();
    if (res.status === 204 || !text.trim()) {
      return undefined as T;
    }
    return JSON.parse(text) as T;
  }

  private async requestForm<T>(
    path: string,
    formData: FormData,
    options?: { timeout?: number }
  ): Promise<T> {
    const url = `${this.baseUrl}/api${path}`;
    const headers: Record<string, string> = {
      Authorization: `Token ${this.tokenId}:${this.tokenSecret}`,
    };
    const timeout = options?.timeout ?? 120000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const text = await res.text();
      let message = text;
      try {
        const parsed = JSON.parse(text) as { message?: string };
        if (parsed.message) message = parsed.message;
      } catch {
        // ignore
      }
      const err = new Error(message) as Error & {
        status?: number;
        response?: { status: number; data: string };
      };
      err.status = res.status;
      err.response = { status: res.status, data: text };
      throw err;
    }
    return res.json() as Promise<T>;
  }

  private async getBookSlug(bookId: number): Promise<string> {
    if (this.bookSlugCache.has(bookId)) {
      return this.bookSlugCache.get(bookId)!;
    }
    try {
      const data = await this.request<Book>('GET', `/books/${bookId}`);
      const slug = data.slug || String(bookId);
      this.bookSlugCache.set(bookId, slug);
      return slug;
    } catch {
      return String(bookId);
    }
  }

  private async getPageInfo(pageId: number): Promise<{ slug: string; bookId: number }> {
    if (this.pageInfoCache.has(pageId)) {
      return this.pageInfoCache.get(pageId)!;
    }
    try {
      const data = await this.request<Page & { book_id: number }>('GET', `/pages/${pageId}`);
      const info = {
        slug: data.slug || String(pageId),
        bookId: data.book_id,
      };
      this.pageInfoCache.set(pageId, info);
      return info;
    } catch {
      return { slug: String(pageId), bookId: 0 };
    }
  }

  private async generatePageUrlFromId(pageId: number): Promise<string> {
    const pageInfo = await this.getPageInfo(pageId);
    if (pageInfo.bookId) {
      const bookSlug = await this.getBookSlug(pageInfo.bookId);
      return `${this.baseUrl}/books/${bookSlug}/page/${pageInfo.slug}`;
    }
    return `${this.baseUrl}/link/${pageId}`;
  }

  private generateBookUrl(book: Book): string {
    return `${this.baseUrl}/books/${book.slug || book.id}`;
  }

  private async generatePageUrl(page: Page): Promise<string> {
    const bookSlug = await this.getBookSlug(page.book_id);
    return `${this.baseUrl}/books/${bookSlug}/page/${page.slug || page.id}`;
  }

  private async generateChapterUrl(chapter: Chapter): Promise<string> {
    const bookSlug = await this.getBookSlug(chapter.book_id);
    return `${this.baseUrl}/books/${bookSlug}/chapter/${chapter.slug || chapter.id}`;
  }

  private generateShelfUrl(shelf: Shelf): string {
    return `${this.baseUrl}/shelves/${shelf.slug || shelf.id}`;
  }

  private generateSearchUrl(query: string): string {
    const encodedQuery = encodeURIComponent(query);
    return `${this.baseUrl}/search?term=${encodedQuery}`;
  }

  private enhanceBookResponse(book: Book): Record<string, unknown> {
    const lastUpdated = this.formatDate(book.updated_at);
    const created = this.formatDate(book.created_at);
    return {
      ...book,
      url: this.generateBookUrl(book),
      direct_link: `[${book.name}](${this.generateBookUrl(book)})`,
      last_updated_friendly: lastUpdated,
      created_friendly: created,
      summary: book.description ? `${book.description.substring(0, 100)}${book.description.length > 100 ? '...' : ''}` : 'No description available',
      content_info: `Book created ${created}, last updated ${lastUpdated}`,
    };
  }

  private async enhancePageResponse(page: Page): Promise<Record<string, unknown>> {
    const lastUpdated = this.formatDate(page.updated_at);
    const created = this.formatDate(page.created_at);
    const contentPreview = page.text ? `${page.text.substring(0, 200)}${page.text.length > 200 ? '...' : ''}` : 'No content preview available';
    const url = await this.generatePageUrl(page);
    return {
      ...page,
      url,
      direct_link: `[${page.name}](${url})`,
      last_updated_friendly: lastUpdated,
      created_friendly: created,
      content_preview: contentPreview,
      content_info: `Page created ${created}, last updated ${lastUpdated}`,
      word_count: page.text ? page.text.split(' ').length : 0,
      location: `Book ID ${page.book_id}${page.chapter_id ? `, Chapter ID ${page.chapter_id}` : ''}`,
    };
  }

  private async enhanceChapterResponse(chapter: Chapter): Promise<Record<string, unknown>> {
    const lastUpdated = this.formatDate(chapter.updated_at);
    const created = this.formatDate(chapter.created_at);
    const url = await this.generateChapterUrl(chapter);
    return {
      ...chapter,
      url,
      direct_link: `[${chapter.name}](${url})`,
      last_updated_friendly: lastUpdated,
      created_friendly: created,
      summary: chapter.description ? `${chapter.description.substring(0, 100)}${chapter.description.length > 100 ? '...' : ''}` : 'No description available',
      content_info: `Chapter created ${created}, last updated ${lastUpdated}`,
      location: `In Book ID ${chapter.book_id}`,
    };
  }

  private enhanceShelfResponse(shelf: Shelf): Record<string, unknown> {
    const lastUpdated = this.formatDate(shelf.updated_at);
    const created = this.formatDate(shelf.created_at);
    const bookCount = shelf.books?.length || 0;
    return {
      ...shelf,
      url: this.generateShelfUrl(shelf),
      direct_link: `[${shelf.name}](${this.generateShelfUrl(shelf)})`,
      last_updated_friendly: lastUpdated,
      created_friendly: created,
      summary: shelf.description ? `${shelf.description.substring(0, 100)}${shelf.description.length > 100 ? '...' : ''}` : 'No description available',
      content_info: `Shelf with ${bookCount} book${bookCount !== 1 ? 's' : ''}, created ${created}, last updated ${lastUpdated}`,
      book_count: bookCount,
      books: shelf.books?.map((book) => this.enhanceBookResponse(book)),
      tags_summary: shelf.tags?.length ? `Tagged with: ${shelf.tags.map((t) => `${t.name}${t.value ? `=${t.value}` : ''}`).join(', ')}` : 'No tags',
    };
  }

  private async enhanceSearchResults(
    results: SearchResult[],
    originalQuery: string
  ): Promise<Record<string, unknown>> {
    const enhancedResults = await Promise.all(
      results.map(async (result) => {
        const url = await this.generateContentUrl(result);
        return {
          ...result,
          url,
          direct_link: `[${result.name}](${url})`,
          content_preview: result.preview_content?.content ? `${result.preview_content.content.substring(0, 150)}${result.preview_content.content.length > 150 ? '...' : ''}` : 'No preview available',
          content_type: result.type.charAt(0).toUpperCase() + result.type.slice(1),
          location_info: result.book_id ? `In book ID ${result.book_id}${result.chapter_id ? `, chapter ID ${result.chapter_id}` : ''}` : 'Location unknown',
        };
      })
    );
    return {
      search_query: originalQuery,
      search_url: this.generateSearchUrl(originalQuery),
      summary: `Found ${results.length} results for "${originalQuery}"`,
      results: enhancedResults,
    };
  }

  private async generateContentUrl(result: SearchResult): Promise<string> {
    switch (result.type) {
      case 'page':
        if (result.book_id) {
          const bookSlug = await this.getBookSlug(result.book_id);
          return `${this.baseUrl}/books/${bookSlug}/page/${result.slug || result.id}`;
        }
        return `${this.baseUrl}/link/${result.id}`;
      case 'chapter':
        if (result.book_id) {
          const bookSlug = await this.getBookSlug(result.book_id);
          return `${this.baseUrl}/books/${bookSlug}/chapter/${result.slug || result.id}`;
        }
        return `${this.baseUrl}/link/${result.id}`;
      case 'book':
        return `${this.baseUrl}/books/${result.slug || result.id}`;
      case 'bookshelf':
      case 'shelf':
        return `${this.baseUrl}/shelves/${result.slug || result.id}`;
      default:
        return `${this.baseUrl}/link/${result.id}`;
    }
  }

  async searchContent(
    query: string,
    options?: { type?: 'book' | 'page' | 'chapter' | 'bookshelf'; count?: number; offset?: number }
  ): Promise<Record<string, unknown>> {
    let searchQuery = query;
    if (options?.type) {
      searchQuery = `{type:${options.type}} ${query}`.trim();
    }
    const params: Record<string, string | number | undefined> = { query: searchQuery };
    if (options?.count) params.count = Math.min(options.count, 500);
    if (options?.offset) params.offset = options.offset;
    const raw = await this.request<{ data?: SearchResult[] } | SearchResult[]>('GET', '/search', params);
    const results = Array.isArray(raw) ? raw : (raw.data ?? (raw as { data?: SearchResult[] }).data ?? []);
    return this.enhanceSearchResults(results as SearchResult[], query);
  }

  async searchPages(
    query: string,
    options?: { bookId?: number; count?: number; offset?: number }
  ): Promise<Record<string, unknown>> {
    let searchQuery = `{type:page} ${query}`.trim();
    if (options?.bookId) {
      searchQuery = `{book_id:${options.bookId}} ${searchQuery}`;
    }
    const params: Record<string, string | number | undefined> = { query: searchQuery };
    if (options?.count) params.count = Math.min(options.count, 500);
    if (options?.offset) params.offset = options.offset ?? 0;
    const raw = await this.request<{ data?: SearchResult[] } | SearchResult[]>('GET', '/search', params);
    const results = Array.isArray(raw) ? raw : (raw as { data?: SearchResult[] }).data ?? [];
    return this.enhanceSearchResults(results as SearchResult[], query);
  }

  async getBooks(options?: {
    offset?: number;
    count?: number;
    sort?: string;
    filter?: Record<string, unknown>;
  }): Promise<{ data: Record<string, unknown>[]; total: number }> {
    const params: Record<string, string | number | undefined> = {
      offset: options?.offset ?? 0,
      count: Math.min(options?.count ?? 50, 500),
    };
    if (options?.sort) params.sort = options.sort;
    if (options?.filter) {
      for (const [k, v] of Object.entries(options.filter)) {
        params[`filter[${k}]`] = String(v);
      }
    }
    const data = await this.request<{ data: Book[]; total: number }>('GET', '/books', params);
    return {
      ...data,
      data: data.data.map((book) => this.enhanceBookResponse(book)),
    };
  }

  async getBook(id: number): Promise<Record<string, unknown>> {
    const data = await this.request<Book>('GET', `/books/${id}`);
    return this.enhanceBookResponse(data);
  }

  async getPages(options?: {
    bookId?: number;
    chapterId?: number;
    offset?: number;
    count?: number;
    sort?: string;
    filter?: Record<string, unknown>;
  }): Promise<{ data: Record<string, unknown>[]; total: number }> {
    const params: Record<string, string | number | undefined> = {
      offset: options?.offset ?? 0,
      count: Math.min(options?.count ?? 50, 500),
    };
    const filter: Record<string, unknown> = { ...options?.filter };
    if (options?.bookId) filter.book_id = options.bookId;
    if (options?.chapterId) filter.chapter_id = options.chapterId;
    if (Object.keys(filter).length > 0) params.filter = JSON.stringify(filter);
    if (options?.sort) params.sort = options.sort;
    const data = await this.request<{ data: Page[]; total: number }>('GET', '/pages', params);
    return {
      ...data,
      data: await Promise.all(data.data.map((page) => this.enhancePageResponse(page))),
    };
  }

  async getPage(id: number): Promise<Record<string, unknown>> {
    const data = await this.request<Page>('GET', `/pages/${id}`);
    return this.enhancePageResponse(data);
  }

  async getChapters(bookId?: number, offset = 0, count = 50): Promise<{
    data: Record<string, unknown>[];
    total: number;
  }> {
    const params: Record<string, string | number | undefined> = { offset, count };
    if (bookId) params.filter = JSON.stringify({ book_id: bookId });
    const data = await this.request<{ data: Chapter[]; total: number }>('GET', '/chapters', params);
    return {
      ...data,
      data: await Promise.all(data.data.map((chapter) => this.enhanceChapterResponse(chapter))),
    };
  }

  async getChapter(id: number): Promise<Record<string, unknown>> {
    const data = await this.request<Chapter>('GET', `/chapters/${id}`);
    return this.enhanceChapterResponse(data);
  }

  async createBook(data: { name: string; description?: string; tags?: Tag[] }): Promise<Record<string, unknown>> {
    if (!this.enableWrite) {
      throw new Error('Write operations are disabled. Set BOOKSTACK_ENABLE_WRITE=true to enable.');
    }
    const created = await this.request<Book>('POST', '/books', undefined, data);
    return this.enhanceBookResponse(created);
  }

  async updateBook(
    id: number,
    data: { name?: string; description?: string; tags?: Tag[] }
  ): Promise<Record<string, unknown>> {
    if (!this.enableWrite) {
      throw new Error('Write operations are disabled. Set BOOKSTACK_ENABLE_WRITE=true to enable.');
    }
    const updated = await this.request<Book>('PUT', `/books/${id}`, undefined, data);
    return this.enhanceBookResponse(updated);
  }

  async deleteBook(id: number): Promise<unknown> {
    if (!this.enableWrite) {
      throw new Error('Write operations are disabled. Set BOOKSTACK_ENABLE_WRITE=true to enable.');
    }
    return this.request('DELETE', `/books/${id}`);
  }

  async createChapter(data: {
    book_id: number;
    name: string;
    description?: string;
    tags?: Tag[];
  }): Promise<Record<string, unknown>> {
    if (!this.enableWrite) {
      throw new Error('Write operations are disabled. Set BOOKSTACK_ENABLE_WRITE=true to enable.');
    }
    const created = await this.request<Chapter>('POST', '/chapters', undefined, data);
    return this.enhanceChapterResponse(created);
  }

  async updateChapter(
    id: number,
    data: { name?: string; description?: string; book_id?: number; tags?: Tag[] }
  ): Promise<Record<string, unknown>> {
    if (!this.enableWrite) {
      throw new Error('Write operations are disabled. Set BOOKSTACK_ENABLE_WRITE=true to enable.');
    }
    const updated = await this.request<Chapter>('PUT', `/chapters/${id}`, undefined, data);
    return this.enhanceChapterResponse(updated);
  }

  async deleteChapter(id: number): Promise<unknown> {
    if (!this.enableWrite) {
      throw new Error('Write operations are disabled. Set BOOKSTACK_ENABLE_WRITE=true to enable.');
    }
    return this.request('DELETE', `/chapters/${id}`);
  }

  async createPage(data: {
    name: string;
    html?: string;
    markdown?: string;
    book_id: number;
    chapter_id?: number;
  }): Promise<Record<string, unknown>> {
    if (!this.enableWrite) {
      throw new Error('Write operations are disabled. Set BOOKSTACK_ENABLE_WRITE=true to enable.');
    }
    const created = await this.request<Page>('POST', '/pages', undefined, data);
    return this.enhancePageResponse(created);
  }

  async updatePage(id: number, data: { name?: string; html?: string; markdown?: string }): Promise<Record<string, unknown>> {
    if (!this.enableWrite) {
      throw new Error('Write operations are disabled. Set BOOKSTACK_ENABLE_WRITE=true to enable.');
    }
    const updated = await this.request<Page>('PUT', `/pages/${id}`, undefined, data);
    return this.enhancePageResponse(updated);
  }

  async deletePage(id: number): Promise<unknown> {
    if (!this.enableWrite) {
      throw new Error('Write operations are disabled. Set BOOKSTACK_ENABLE_WRITE=true to enable.');
    }
    return this.request('DELETE', `/pages/${id}`);
  }

  async exportPage(
    id: number,
    format: 'html' | 'pdf' | 'markdown' | 'plaintext' | 'zip'
  ): Promise<string | Record<string, unknown>> {
    try {
      if (format === 'pdf' || format === 'zip') {
        const page = (await this.getPage(id)) as unknown as Page & { book_id: number; slug: string };
        const book = (await this.getBook(page.book_id)) as unknown as Book;
        const directUrl = `${this.baseUrl}/books/${book.slug}/page/${page.slug}/export/${format}`;
        const filename = `${page.slug}.${format}`;
        const contentType = format === 'pdf' ? 'application/pdf' : 'application/zip';
        return {
          format,
          filename,
          download_url: directUrl,
          content_type: contentType,
          export_success: true,
          page_id: id,
          page_name: page.name,
          book_name: book.name,
          direct_download: true,
          note: "This is a direct link to BookStack's web export. You may need to be logged in to BookStack to access it.",
        };
      }
      const text = await this.request<string>('GET', `/pages/${id}/export/${format}`, undefined, undefined, { returnText: true });
      if (!text) {
        throw new Error(`Empty ${format} content returned from BookStack API`);
      }
      return text;
    } catch (error) {
      throw new Error(
        `Failed to export page ${id} as ${format}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async exportBook(
    id: number,
    format: 'html' | 'pdf' | 'markdown' | 'plaintext' | 'zip'
  ): Promise<string | Record<string, unknown>> {
    if (format === 'pdf' || format === 'zip') {
      const book = (await this.getBook(id)) as unknown as Book;
      const directUrl = `${this.baseUrl}/books/${book.slug}/export/${format}`;
      const filename = `${book.slug}.${format}`;
      const contentType = format === 'pdf' ? 'application/pdf' : 'application/zip';
      return {
        format,
        filename,
        download_url: directUrl,
        content_type: contentType,
        export_success: true,
        book_id: id,
        book_name: book.name,
        direct_download: true,
        note: "This is a direct link to BookStack's web export. You may need to be logged in to BookStack to access it.",
      };
    }
    const text = await this.request<string>('GET', `/books/${id}/export/${format}`, undefined, undefined, { returnText: true });
    if (!text) {
      throw new Error(`Empty ${format} content returned from BookStack API for book ${id}`);
    }
    return text;
  }

  async exportChapter(
    id: number,
    format: 'html' | 'pdf' | 'markdown' | 'plaintext' | 'zip'
  ): Promise<string | Record<string, unknown>> {
    if (format === 'pdf' || format === 'zip') {
      const chapter = (await this.getChapter(id)) as unknown as Chapter & { slug: string };
      const book = (await this.getBook(chapter.book_id)) as unknown as Book;
      const directUrl = `${this.baseUrl}/books/${book.slug}/chapter/${chapter.slug}/export/${format}`;
      const filename = `${chapter.slug}.${format}`;
      const contentType = format === 'pdf' ? 'application/pdf' : 'application/zip';
      return {
        format,
        filename,
        download_url: directUrl,
        content_type: contentType,
        export_success: true,
        chapter_id: id,
        chapter_name: chapter.name,
        book_name: book.name,
        direct_download: true,
        note: "This is a direct link to BookStack's web export. You may need to be logged in to BookStack to access it.",
      };
    }
    const text = await this.request<string>('GET', `/chapters/${id}/export/${format}`, undefined, undefined, { returnText: true });
    if (!text) {
      throw new Error(`Empty ${format} content returned from BookStack API for chapter ${id}`);
    }
    return text;
  }

  async getRecentChanges(options?: {
    type?: 'all' | 'page' | 'book' | 'chapter';
    limit?: number;
    days?: number;
  }): Promise<Record<string, unknown>> {
    const limit = Math.min(options?.limit ?? 20, 100);
    const days = options?.days ?? 30;
    const type = options?.type ?? 'all';
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    const dateFilter = dateThreshold.toISOString().split('T')[0];
    let searchQuery = `{updated_at:>=${dateFilter}}`;
    if (type !== 'all') {
      searchQuery = `{type:${type}} ${searchQuery}`;
    }
    const params = {
      query: searchQuery,
      count: limit,
      sort: 'updated_at',
    };
    const raw = await this.request<{ data?: SearchResult[] } | SearchResult[]>('GET', '/search', params);
    const results = Array.isArray(raw) ? raw : (raw as { data?: SearchResult[] }).data ?? [];

    const enhancedResults = await Promise.all(
      (results as SearchResult[]).map(async (result) => {
        let contextualInfo = '';
        let contentPreview = result.preview_content?.content ?? '';
        try {
          if (result.type === 'page' && result.id) {
            const fullPage = await this.request<Page & { book?: { name: string }; chapter?: { name: string } }>('GET', `/pages/${result.id}`);
            const pageData = fullPage;
            contentPreview = pageData.text?.substring(0, 200) ?? contentPreview;
            contextualInfo = `Updated in book: ${pageData.book?.name ?? 'Unknown Book'}`;
            if (pageData.chapter) {
              contextualInfo += `, chapter: ${pageData.chapter.name}`;
            }
          } else if (result.type === 'book' && result.id) {
            const fullBook = await this.request<Book & { page_count?: number }>('GET', `/books/${result.id}`);
            const bookData = fullBook;
            contentPreview = bookData.description?.substring(0, 200) ?? 'No description available';
            contextualInfo = `Book with ${bookData.page_count ?? 0} pages`;
          } else if (result.type === 'chapter' && result.id) {
            const fullChapter = await this.request<Chapter & { book?: { name: string } }>('GET', `/chapters/${result.id}`);
            const chapterData = fullChapter;
            contentPreview = chapterData.description?.substring(0, 200) ?? 'No description available';
            contextualInfo = `Chapter in book: ${chapterData.book?.name ?? 'Unknown Book'}`;
          }
        } catch {
          contextualInfo = `${result.type.charAt(0).toUpperCase() + result.type.slice(1)} content`;
        }
        const url = await this.generateContentUrl(result);
        return {
          ...result,
          url,
          direct_link: `[${result.name}](${url})`,
          content_preview: contentPreview ? `${contentPreview}${contentPreview.length >= 200 ? '...' : ''}` : 'No preview available',
          contextual_info: contextualInfo,
          last_updated: this.formatDate(result.updated_at ?? result.created_at ?? ''),
          change_summary: `${result.type === 'page' ? 'Page' : result.type === 'book' ? 'Book' : 'Chapter'} "${result.name}" was updated`,
        };
      })
    );
    return {
      search_query: `Recent changes in the last ${days} days (${type})`,
      date_threshold: dateFilter,
      search_url: this.generateSearchUrl(searchQuery),
      total_found: results.length,
      summary: `Found ${results.length} items updated in the last ${days} days${type !== 'all' ? ` (${type}s only)` : ''}`,
      results: enhancedResults,
    };
  }

  private formatDate(dateString: string): string {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Less than an hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks} weeks ago`;
    return date.toLocaleDateString();
  }

  async getAuditLog(options?: {
    offset?: number;
    count?: number;
    sort?: string;
    filter?: Record<string, unknown>;
  }): Promise<ListResponse<AuditLogEntry>> {
    const params: Record<string, string | number | undefined> = {
      offset: options?.offset ?? 0,
      count: Math.min(options?.count ?? 50, 500),
    };
    if (options?.sort) params.sort = options.sort;
    if (options?.filter) {
      Object.entries(options.filter).forEach(([k, v]) => {
        params[`filter[${k}]`] = String(v);
      });
    }
    return this.request<ListResponse<AuditLogEntry>>('GET', '/audit-log', params);
  }

  async getSystemInfo(): Promise<SystemInfo> {
    return this.request<SystemInfo>('GET', '/system');
  }

  async getUsers(options?: {
    offset?: number;
    count?: number;
    sort?: string;
    filter?: Record<string, unknown>;
  }): Promise<ListResponse<User>> {
    const params: Record<string, string | number | undefined> = {
      offset: options?.offset ?? 0,
      count: Math.min(options?.count ?? 50, 500),
    };
    if (options?.sort) params.sort = options.sort;
    if (options?.filter) {
      Object.entries(options.filter).forEach(([k, v]) => {
        params[`filter[${k}]`] = String(v);
      });
    }
    return this.request<ListResponse<User>>('GET', '/users', params);
  }

  async getUser(id: number): Promise<User> {
    return this.request<User>('GET', `/users/${id}`);
  }

  async getRecycleBin(options?: {
    offset?: number;
    count?: number;
    sort?: string;
  }): Promise<ListResponse<RecycleBinEntry>> {
    const params: Record<string, string | number | undefined> = {
      offset: options?.offset ?? 0,
      count: Math.min(options?.count ?? 50, 500),
    };
    if (options?.sort) params.sort = options.sort;
    return this.request<ListResponse<RecycleBinEntry>>('GET', '/recycle-bin', params);
  }

  async getImageGallery(options?: {
    offset?: number;
    count?: number;
    sort?: string;
    filter?: Record<string, unknown>;
  }): Promise<ListResponse<ImageGalleryEntry>> {
    const params: Record<string, string | number | undefined> = {
      offset: options?.offset ?? 0,
      count: Math.min(options?.count ?? 50, 500),
    };
    if (options?.sort) params.sort = options.sort;
    if (options?.filter) {
      Object.entries(options.filter).forEach(([k, v]) => {
        params[`filter[${k}]`] = String(v);
      });
    }
    return this.request<ListResponse<ImageGalleryEntry>>('GET', '/image-gallery', params);
  }

  async getImage(id: number): Promise<ImageGalleryEntry> {
    return this.request<ImageGalleryEntry>('GET', `/image-gallery/${id}`);
  }

  async getComments(options?: {
    page_id?: number;
    offset?: number;
    count?: number;
    sort?: string;
  }): Promise<ListResponse<Comment>> {
    const params: Record<string, string | number | undefined> = {
      offset: options?.offset ?? 0,
      count: Math.min(options?.count ?? 50, 500),
    };
    if (options?.page_id) {
      params['filter[commentable_id]'] = options.page_id;
      params['filter[commentable_type]'] = 'page';
    }
    if (options?.sort) params.sort = options.sort;
    return this.request<ListResponse<Comment>>('GET', '/comments', params);
  }

  async getComment(id: number): Promise<Comment> {
    return this.request<Comment>('GET', `/comments/${id}`);
  }

  async createComment(data: {
    page_id: number;
    html: string;
    reply_to?: number;
    content_ref?: string;
  }): Promise<Comment> {
    if (!this.enableWrite) {
      throw new Error('Write operations are disabled. Set BOOKSTACK_ENABLE_WRITE=true to enable.');
    }
    return this.request<Comment>('POST', '/comments', undefined, data);
  }

  async updateComment(id: number, data: { html?: string; archived?: boolean }): Promise<Comment> {
    if (!this.enableWrite) {
      throw new Error('Write operations are disabled. Set BOOKSTACK_ENABLE_WRITE=true to enable.');
    }
    return this.request<Comment>('PUT', `/comments/${id}`, undefined, data);
  }

  async deleteComment(id: number): Promise<unknown> {
    if (!this.enableWrite) {
      throw new Error('Write operations are disabled. Set BOOKSTACK_ENABLE_WRITE=true to enable.');
    }
    return this.request('DELETE', `/comments/${id}`);
  }

  async getShelves(options?: {
    offset?: number;
    count?: number;
    sort?: string;
    filter?: Record<string, unknown>;
  }): Promise<{ data: Record<string, unknown>[]; total: number }> {
    const params: Record<string, string | number | undefined> = {
      offset: options?.offset ?? 0,
      count: Math.min(options?.count ?? 50, 500),
    };
    if (options?.sort) params.sort = options.sort;
    if (options?.filter) {
      for (const [k, v] of Object.entries(options.filter)) {
        params[`filter[${k}]`] = String(v);
      }
    }
    const data = await this.request<{ data: Shelf[]; total: number }>('GET', '/shelves', params);
    return {
      ...data,
      data: data.data.map((shelf) => this.enhanceShelfResponse(shelf)),
    };
  }

  async getShelf(id: number): Promise<Record<string, unknown>> {
    const data = await this.request<Shelf>('GET', `/shelves/${id}`);
    return this.enhanceShelfResponse(data);
  }

  async createShelf(data: {
    name: string;
    description?: string;
    books?: number[];
    tags?: Tag[];
  }): Promise<Record<string, unknown>> {
    if (!this.enableWrite) {
      throw new Error('Write operations are disabled. Set BOOKSTACK_ENABLE_WRITE=true to enable.');
    }
    const created = await this.request<Shelf>('POST', '/shelves', undefined, data);
    return this.enhanceShelfResponse(created);
  }

  async updateShelf(
    id: number,
    data: { name?: string; description?: string; books?: number[]; tags?: Tag[] }
  ): Promise<Record<string, unknown>> {
    if (!this.enableWrite) {
      throw new Error('Write operations are disabled. Set BOOKSTACK_ENABLE_WRITE=true to enable.');
    }
    const updated = await this.request<Shelf>('PUT', `/shelves/${id}`, undefined, data);
    return this.enhanceShelfResponse(updated);
  }

  async deleteShelf(id: number): Promise<unknown> {
    if (!this.enableWrite) {
      throw new Error('Write operations are disabled. Set BOOKSTACK_ENABLE_WRITE=true to enable.');
    }
    return this.request('DELETE', `/shelves/${id}`);
  }

  async getAttachments(options?: {
    offset?: number;
    count?: number;
    sort?: string;
    filter?: Record<string, unknown>;
  }): Promise<ListResponse<Attachment> & { data: (Attachment & { page_url: string; direct_link: string })[] }> {
    const params: Record<string, string | number | undefined> = {
      offset: options?.offset ?? 0,
      count: Math.min(options?.count ?? 50, 500),
    };
    if (options?.sort) params.sort = options.sort;
    if (options?.filter) {
      for (const [k, v] of Object.entries(options.filter)) {
        params[`filter[${k}]`] = String(v);
      }
    }
    const data = await this.request<{ data: Attachment[]; total: number }>('GET', '/attachments', params);
    const enhanced = await Promise.all(
      data.data.map(async (attachment) => ({
        ...attachment,
        page_url: await this.generatePageUrlFromId(attachment.uploaded_to),
        direct_link: `[${attachment.name}](${this.baseUrl}/attachments/${attachment.id})`,
      }))
    );
    return { ...data, data: enhanced };
  }

  async getAttachment(id: number): Promise<Attachment & { page_url: string; direct_link: string; download_url: string }> {
    const attachment = await this.request<Attachment>('GET', `/attachments/${id}`);
    return {
      ...attachment,
      page_url: await this.generatePageUrlFromId(attachment.uploaded_to),
      direct_link: `[${attachment.name}](${this.baseUrl}/attachments/${attachment.id})`,
      download_url: `${this.baseUrl}/attachments/${attachment.id}`,
    };
  }

  async createAttachment(data: {
    uploaded_to: number;
    name: string;
    link?: string;
  }): Promise<Attachment & { page_url: string; direct_link: string }> {
    if (!this.enableWrite) {
      throw new Error('Write operations are disabled. Set BOOKSTACK_ENABLE_WRITE=true to enable.');
    }
    const attachment = await this.request<Attachment>('POST', '/attachments', undefined, data);
    return {
      ...attachment,
      page_url: await this.generatePageUrlFromId(attachment.uploaded_to),
      direct_link: `[${attachment.name}](${this.baseUrl}/attachments/${attachment.id})`,
    };
  }

  async uploadAttachment(data: {
    uploaded_to: number;
    name?: string;
    file_path: string;
  }): Promise<Attachment & { page_url: string; direct_link: string }> {
    if (!this.enableWrite) {
      throw new Error('Write operations are disabled. Set BOOKSTACK_ENABLE_WRITE=true to enable.');
    }
    const absolutePath = data.file_path.startsWith('~')
      ? data.file_path.replace('~', process.env.HOME ?? '')
      : data.file_path;
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }
    const fileBuffer = fs.readFileSync(absolutePath);
    const fileName = path.basename(absolutePath);
    const attachmentName = data.name ?? fileName;
    const formData = new FormData();
    formData.append('name', attachmentName);
    formData.append('uploaded_to', String(data.uploaded_to));
    formData.append('file', new Blob([fileBuffer]), fileName);
    const attachment = await this.requestForm<Attachment>('/attachments', formData, { timeout: 120_000 });
    return {
      ...attachment,
      page_url: await this.generatePageUrlFromId(attachment.uploaded_to),
      direct_link: `[${attachment.name}](${this.baseUrl}/attachments/${attachment.id})`,
    };
  }

  async updateAttachment(
    id: number,
    data: { name?: string; link?: string; uploaded_to?: number }
  ): Promise<Attachment & { page_url: string; direct_link: string }> {
    if (!this.enableWrite) {
      throw new Error('Write operations are disabled. Set BOOKSTACK_ENABLE_WRITE=true to enable.');
    }
    const attachment = await this.request<Attachment>('PUT', `/attachments/${id}`, undefined, data);
    return {
      ...attachment,
      page_url: await this.generatePageUrlFromId(attachment.uploaded_to),
      direct_link: `[${attachment.name}](${this.baseUrl}/attachments/${attachment.id})`,
    };
  }

  async deleteAttachment(id: number): Promise<unknown> {
    if (!this.enableWrite) {
      throw new Error('Write operations are disabled. Set BOOKSTACK_ENABLE_WRITE=true to enable.');
    }
    return this.request('DELETE', `/attachments/${id}`);
  }
}
