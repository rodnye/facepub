import type { Page } from 'playwright';
import type { SessionState } from '../types';
import { BrowserManager } from '../browser/browser-manager';

/**
 * Abstract base class for all Page Object Models.
 * Provides shared navigation, waiting, and session utilities.
 */
export abstract class BasePage {
  protected readonly defaultTimeout: number;

  constructor(
    protected readonly browserManager: BrowserManager,
    defaultTimeout: number = 30000,
  ) {
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Gets an authenticated page for the given account session.
   */
  protected async getPage(
    accountId: string,
    session: SessionState | null,
  ): Promise<Page> {
    return this.browserManager.getPage(accountId, session);
  }

  /**
   * Navigates to a URL with retry logic.
   */
  protected async navigateWithRetry(
    page: Page,
    url: string,
    maxRetries: number = 2,
  ): Promise<void> {
    let attemptsLeft = maxRetries;
    while (true) {
      try {
        await page.goto(url, {
          timeout: this.defaultTimeout,
          waitUntil: 'domcontentloaded',
        });
        return;
      } catch (error) {
        if (attemptsLeft <= 0) throw error;
        attemptsLeft--;
        await page.waitForTimeout(1000);
      }
    }
  }

  /**
   * Waits for a selector to be visible.
   */
  protected async waitForVisible(
    page: Page,
    selector: string,
    timeout?: number,
  ): Promise<void> {
    await page
      .locator(selector)
      .first()
      .waitFor({
        state: 'visible',
        timeout: timeout ?? this.defaultTimeout,
      });
  }

  /**
   * Waits for a selector to be detached (removed from DOM).
   */
  protected async waitForDetached(
    page: Page,
    selector: string,
    timeout?: number,
  ): Promise<void> {
    await page
      .locator(selector)
      .first()
      .waitFor({
        state: 'detached',
        timeout: timeout ?? this.defaultTimeout,
      });
  }

  /**
   * Checks if the current URL indicates a login/auth page.
   */
  protected isAuthUrl(url: string): boolean {
    return (
      url.includes('login') ||
      url.includes('two_factor') ||
      url.includes('two_step_verification') ||
      url.includes('auth') ||
      url.includes('checkpoint')
    );
  }

  /**
   * Checks if the page shows a login form.
   */
  protected async isLoginPage(page: Page): Promise<boolean> {
    try {
      await page
        .locator('button[name=login]')
        .first()
        .waitFor({ state: 'attached', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
