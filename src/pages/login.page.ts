import type { Page } from 'playwright';
import type { AccountCredentials, SessionState } from '../types';
import { BasePage } from './base.page';

export interface AuthenticateOptions {
  credentials: AccountCredentials;
  /** Existing session to try before login */
  existingSession?: SessionState | null;
  /** Timeout for the auth flow in ms (default 5min) */
  timeout?: number;
  /** Callback invoked when manual intervention might be needed */
  onManualRequired?: () => void;
}

/**
 * Page Object for Facebook login and authentication flows.
 */
export class LoginPage extends BasePage {
  /**
   * Authenticates a Facebook account.
   * Attempts to reuse existing session; falls back to credential login.
   * Returns the storage state on success.
   */
  async authenticate(options: AuthenticateOptions): Promise<SessionState> {
    const {
      credentials,
      existingSession,
      timeout = 300000,
      onManualRequired,
    } = options;
    const page = await this.getPage(
      credentials.accountId,
      existingSession ?? null,
    );

    await page.goto('https://www.facebook.com/login');
    const currentUrl = page.url();

    // Already authenticated via stored session
    if (!this.isAuthUrl(currentUrl)) {
      return this.browserManager.getStorageState(page);
    }

    // Bring browser to front for potential captcha
    await page.bringToFront();

    // Fill credentials
    await this.fillCredentials(page, credentials);

    // Wait for navigation away from login
    await this.waitForAuthCompletion(page, timeout, onManualRequired);

    return this.browserManager.getStorageState(page);
  }

  /**
   * Checks if a stored session is still valid by navigating to FB.
   */
  async isSessionValid(
    accountId: string,
    session: SessionState,
  ): Promise<boolean> {
    const page = await this.getPage(accountId, session);
    await page.goto('https://www.facebook.com');
    return !(await this.isLoginPage(page));
  }

  /**
   * Fills the login form with credentials. Tries the standard form first,
   * then falls back to generic input selection.
   */
  private async fillCredentials(
    page: Page,
    credentials: AccountCredentials,
  ): Promise<void> {
    try {
      await page.locator('#email').fill(credentials.email);
      await page.locator('#pass').fill(credentials.password);
      await page.locator('button[type=submit]').click();
    } catch {
      // Fallback: some FB layouts use generic inputs
      const inputs = await page.locator('input').all();
      if (inputs.length >= 2) {
        await inputs[0].fill(credentials.email);
        await inputs[1].fill(credentials.password);
        await page
          .locator('button[type=submit], text="Iniciar sesión", text="Log In"')
          .first()
          .click();
      } else {
        throw new Error('Could not locate login form inputs');
      }
    }
  }

  /**
   * Polls until the URL no longer indicates a login/auth page.
   */
  private async waitForAuthCompletion(
    page: Page,
    timeout: number,
    onManualRequired?: () => void,
  ): Promise<void> {
    const startTime = Date.now();
    let notified = false;

    return new Promise<void>((resolve, reject) => {
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;

        if (elapsed > timeout) {
          clearInterval(interval);
          reject(new Error(`Authentication timeout after ${timeout}ms`));
          return;
        }

        // Notify once after 10s that manual intervention may be needed
        if (!notified && elapsed > 10000 && onManualRequired) {
          notified = true;
          onManualRequired();
        }

        if (!this.isAuthUrl(page.url())) {
          clearInterval(interval);
          resolve();
        }
      }, 1000);
    });
  }
}
