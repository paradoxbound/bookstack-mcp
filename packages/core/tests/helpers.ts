import { BookStackClient, BookStackConfig } from '@bookstack-mcp/core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface SeedData {
  bookId: number;
  bookSlug: string;
  chapterId: number;
  pageId: number;
  shelfId: number;
  attachmentId: number;
  commentId: number;
}

const __dirname = typeof import.meta.dirname === 'string' ? import.meta.dirname : path.dirname(fileURLToPath(import.meta.url));
const SEED_FILE = path.join(__dirname, '.seed-data.json');

export function getTestConfig(enableWrite = true): BookStackConfig {
  return {
    baseUrl: process.env.TEST_BOOKSTACK_URL || '',
    tokenId: process.env.TEST_BOOKSTACK_TOKEN_ID || '',
    tokenSecret: process.env.TEST_BOOKSTACK_TOKEN_SECRET || '',
    enableWrite,
  };
}

export function hasTestCredentials(): boolean {
  return !!(
    process.env.TEST_BOOKSTACK_URL &&
    process.env.TEST_BOOKSTACK_TOKEN_ID &&
    process.env.TEST_BOOKSTACK_TOKEN_SECRET
  );
}

export function createWriteClient(): BookStackClient {
  return new BookStackClient(getTestConfig(true));
}

export function createReadOnlyClient(): BookStackClient {
  return new BookStackClient(getTestConfig(false));
}

export function saveSeedData(data: SeedData): void {
  fs.writeFileSync(SEED_FILE, JSON.stringify(data, null, 2));
}

export function loadSeedData(): SeedData | null {
  try {
    const raw = fs.readFileSync(SEED_FILE, 'utf-8');
    return JSON.parse(raw) as SeedData;
  } catch {
    return null;
  }
}

export function hasSeedData(): boolean {
  return fs.existsSync(SEED_FILE);
}

export function cleanupSeedFile(): void {
  if (fs.existsSync(SEED_FILE)) {
    fs.unlinkSync(SEED_FILE);
  }
}

/** Smallest valid 1x1 PNG (68 bytes). */
export function createTestPng(): Buffer {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );
}

/** Plain text file for attachment upload tests. */
export function createTestTextFile(): Buffer {
  return Buffer.from('BookStack MCP test attachment content');
}
