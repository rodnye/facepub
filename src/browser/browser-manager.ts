import { chromium, Browser, Page, BrowserContext } from 'playwright';
import type { BrowserConfig, SessionState } from '../types';

interface UserSessionData {
  context: BrowserContext;
  page: Page | null;
  isActive: boolean;
}

const DEFAULT_VIEWPORT = { width: 1280, height: 720 };
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Manages a shared Playwright browser instance and per-account contexts.
 */
export class BrowserManager {
  private browser: Browser | null = null;
  private readonly sessions = new Map<string, UserSessionData>();
  private readonly config: Required<BrowserConfig>;

  constructor(config: BrowserConfig = {}) {
    this.config = {
      headless: config.headless ?? true,
      executablePath: config.executablePath ?? '',
      viewport: config.viewport ?? DEFAULT_VIEWPORT,
      userAgent: config.userAgent ?? DEFAULT_USER_AGENT,
      antiDetection: config.antiDetection ?? true,
    };
  }

  /**
   * Ensures the shared browser instance is launched.
   */
  async ensureBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      const launchArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        `--window-size=${this.config.viewport.width},${this.config.viewport.height}`,
      ];

      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: launchArgs,
        executablePath: this.config.executablePath || undefined,
      });
    }
    return this.browser;
  }

  /**
   * Creates a new browser context for a session.
   */
  private async createContext(
    sessionId: string,
    storageState: SessionState | null,
  ): Promise<BrowserContext> {
    const browser = await this.ensureBrowser();

    const context = await browser.newContext({
      userAgent: this.config.userAgent,
      viewport: this.config.viewport,
      storageState: storageState ?? undefined,
    });

    if (this.config.antiDetection) {
      await context.addInitScript(`
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        window['chrome'] = { runtime: {} };
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['es-ES', 'es', 'en-US'] });
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) =>
          parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission })
            : originalQuery(parameters);
      `);
    }

    this.sessions.set(sessionId, { context, page: null, isActive: true });
    return context;
  }

  /**
   * Gets or creates an active page for the given session.
   */
  async getPage(
    sessionId: string,
    storageState: SessionState | null,
  ): Promise<Page> {
    let session = this.sessions.get(sessionId);

    if (!session || !session.isActive || session.context.pages().length === 0) {
      if (session?.context) {
        await session.context.close().catch(() => {});
      }
      const context = await this.createContext(sessionId, storageState);
      const page = await context.newPage();
      session = { context, page, isActive: true };
      this.sessions.set(sessionId, session);
    } else if (!session.page || session.page.isClosed()) {
      session.page = await session.context.newPage();
    }

    return session.page!;
  }

  /**
   * Returns an existing page without creating one.
   */
  getExistingPage(sessionId: string): Page | null {
    return this.sessions.get(sessionId)?.page ?? null;
  }

  /**
   * Gets the storage state (cookies + localStorage) from a page's context.
   */
  async getStorageState(page: Page): Promise<SessionState> {
    return page.context().storageState();
  }

  /**
   * Closes a specific user session.
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      await session.context.close().catch(() => {});
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Closes all sessions and the browser.
   */
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.sessions.entries()).map(
      async ([id, session]) => {
        await session.context.close().catch(() => {});
        this.sessions.delete(id);
      },
    );
    await Promise.all(closePromises);

    if (this.browser && this.browser.isConnected()) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Returns stats about active sessions.
   */
  getStats() {
    return {
      isBrowserActive: this.browser?.isConnected() ?? false,
      activeSessions: this.sessions.size,
      sessionIds: Array.from(this.sessions.keys()),
    };
  }
}
