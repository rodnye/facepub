import type {
  FacepubConfig,
  AccountCredentials,
  SessionState,
  CreatePostOptions,
  DeletePostOptions,
  ScrapeGroupOptions,
  ScrapeGroupResult,
  PostResult,
} from '../types';
import { BrowserManager } from '../browser/browser-manager';
import { LoginPage } from '../pages/login.page';
import { GroupPage } from '../pages/group.page';
import { PostPage } from '../pages/post.page';
import { FacepubEventEmitter, FacepubEvents } from '../events';

/**
 * Main orchestrator for Facebook automation.
 * Provides a high-level API for auth, posting, and scraping.
 *
 * @example
 * ```ts
 * const client = new FacebookClient({ browser: { headless: false } });
 * await client.launch();
 * const session = await client.authenticate({ accountId: '123', email: 'a@b.c', password: 'pw' });
 * await client.createPost({ accountId: '123', groupId: '456', message: 'Hi!', session });
 * await client.close();
 * ```
 */
export class FacebookClient extends FacepubEventEmitter {
  private readonly browserManager: BrowserManager;
  private readonly loginPage: LoginPage;
  private readonly groupPage: GroupPage;
  private readonly postPage: PostPage;
  private readonly config: FacepubConfig;
  private launched = false;

  constructor(config: FacepubConfig = {}) {
    super();
    this.config = config;
    this.browserManager = new BrowserManager(config.browser);
    const timeout = config.defaultTimeout ?? 30000;
    this.loginPage = new LoginPage(this.browserManager, timeout);
    this.groupPage = new GroupPage(this.browserManager, timeout);
    this.postPage = new PostPage(this.browserManager, timeout);
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  /**
   * Launches the browser instance.
   */
  async launch(): Promise<void> {
    await this.browserManager.ensureBrowser();
    this.launched = true;
    this.emit(FacepubEvents.BROWSER_LAUNCHED);
  }

  /**
   * Closes all sessions and the browser.
   */
  async close(): Promise<void> {
    await this.browserManager.closeAll();
    this.launched = false;
    this.emit(FacepubEvents.BROWSER_CLOSED);
  }

  // ─── Authentication ──────────────────────────────────────────────────────────

  /**
   * Authenticates a Facebook account.
   * Returns the session storage state for subsequent operations.
   */
  async authenticate(
    credentials: AccountCredentials,
    existingSession?: SessionState | null,
  ): Promise<SessionState> {
    this.ensureLaunched();
    try {
      const session = await this.loginPage.authenticate({
        credentials,
        existingSession,
        timeout: this.config.authTimeout ?? 300000,
        onManualRequired: () => {
          //  can listen to handle captcha manually
        },
      });
      this.emitAuthSuccess(credentials.accountId);
      return session;
    } catch (error) {
      this.emitAuthFailed(
        credentials.accountId,
        error instanceof Error ? error.message : 'Unknown auth error',
      );
      throw error;
    }
  }

  /**
   * Checks if an existing session is still valid.
   */
  async isSessionValid(
    accountId: string,
    session: SessionState,
  ): Promise<boolean> {
    this.ensureLaunched();
    return this.loginPage.isSessionValid(accountId, session);
  }

  // ─── Posts ───────────────────────────────────────────────────────────────────

  /**
   * Creates a post in a Facebook group.
   */
  async createPost(options: CreatePostOptions): Promise<PostResult> {
    this.ensureLaunched();
    try {
      const result = await this.postPage.createPost(options);
      this.emitPostCreated(result.postId, result.groupId);
      return result;
    } catch (error) {
      this.emitPostFailed(
        options.groupId,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Deletes a post from a Facebook group.
   */
  async deletePost(options: DeletePostOptions): Promise<void> {
    this.ensureLaunched();
    await this.postPage.deletePost(options);
    this.emit(FacepubEvents.POST_DELETED, {
      postId: options.postId,
      groupId: options.groupId,
    });
  }

  // ─── Groups ──────────────────────────────────────────────────────────────────

  /**
   * Scrapes metadata from a Facebook group.
   */
  async scrapeGroup({
    accountId,
    groupId,
    session,
  }: ScrapeGroupOptions): Promise<ScrapeGroupResult> {
    this.ensureLaunched();
    return this.groupPage.scrapeGroupData(accountId, groupId, session);
  }

  /**
   * Checks if the account can post in a specific group.
   */
  async canPostInGroup(
    accountId: string,
    groupId: string,
    session: SessionState,
  ): Promise<boolean> {
    this.ensureLaunched();
    return this.groupPage.canPost(accountId, groupId, session);
  }

  // ─── Session Management ──────────────────────────────────────────────────────

  /**
   * Gets the storage state for an active session (for persistence).
   */
  async getSessionState(accountId: string): Promise<SessionState | null> {
    const page = this.browserManager.getExistingPage(accountId);
    if (!page) return null;
    return this.browserManager.getStorageState(page);
  }

  /**
   * Closes a specific account session.
   */
  async closeSession(accountId: string): Promise<void> {
    await this.browserManager.closeSession(accountId);
  }

  // ─── Utilities ───────────────────────────────────────────────────────────────

  /**
   * Returns browser and session statistics.
   */
  getStats() {
    return this.browserManager.getStats();
  }

  /**
   * Exposes the event constants for consumer convenience.
   */
  static readonly Events = FacepubEvents;

  // ─── Private ─────────────────────────────────────────────────────────────────

  private ensureLaunched(): void {
    if (!this.launched) {
      throw new Error('Browser not launched. Call client.launch() first.');
    }
  }
}
