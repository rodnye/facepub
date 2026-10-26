import type { BrowserContext } from 'playwright';

/**
 * Configuration for launching the browser instance.
 */
export interface BrowserConfig {
  headless?: boolean;
  executablePath?: string;
  viewport?: { width: number; height: number };
  userAgent?: string;
  antiDetection?: boolean;
}

/**
 * Global library configuration.
 */
export interface FacepubConfig {
  browser?: BrowserConfig;
  /** Timeout in ms for waiting operations (default: 30000) */
  defaultTimeout?: number;
  /** Timeout in ms for authentication flow (default: 300000 = 5min) */
  authTimeout?: number;
}

/**
 * Credentials needed to authenticate a Facebook account.
 */
export interface AccountCredentials {
  accountId: string;
  email: string;
  password: string;
}

/**
 * Playwright storage state representing a persisted session.
 */
export type SessionState = Awaited<ReturnType<BrowserContext['storageState']>>;

/**
 * Options for creating a post in a Facebook group.
 */
export interface CreatePostOptions {
  accountId: string;
  groupId: string;
  message: string;
  files?: PostFile[];
  session: SessionState;
}

/**
 * File attachment for a post (disk path or in-memory buffer).
 */
export interface PostFile {
  /** Absolute path on disk (for disk storage) */
  path?: string;
  /** Raw buffer (for memory storage) */
  buffer?: Buffer;
  mimeType?: string;
  originalName?: string;
}

/**
 * Options for deleting a post.
 */
export interface DeletePostOptions {
  accountId: string;
  groupId: string;
  postId: string;
  session: SessionState;
}

/**
 * Options for scraping group metadata.
 */
export interface ScrapeGroupOptions {
  accountId: string;
  groupId: string;
  session: SessionState;
}

/**
 * Result of scraping a group.
 */
export interface ScrapeGroupResult {
  groupId: string;
  title: string;
  imageBuffer: Buffer | null;
}

/**
 * Result of a post creation.
 */
export interface PostResult {
  postId: string;
  groupId: string;
  url: string;
}
