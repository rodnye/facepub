import type { Page } from 'playwright';
import type { SessionState, ScrapeGroupResult } from '../types';
import { BasePage } from './base.page';
import { buildGroupUrl } from '../utils/url-matchers';

/**
 * Page Object for Facebook group pages.
 * Handles navigation to groups and metadata scraping.
 */
export class GroupPage extends BasePage {
  /**
   * Navigates to a Facebook group page.
   */
  async navigateToGroup(
    accountId: string,
    groupId: string,
    session: SessionState,
  ): Promise<Page> {
    const page = await this.getPage(accountId, session);
    const url = buildGroupUrl(groupId);
    await this.navigateWithRetry(page, url);
    return page;
  }

  /**
   * Scrapes group metadata: title and cover image.
   * Throws if the group is not accessible.
   */
  async scrapeGroupData(
    accountId: string,
    groupId: string,
    session: SessionState,
  ): Promise<ScrapeGroupResult> {
    const page = await this.navigateToGroup(accountId, groupId, session);

    // Verify group is accessible by checking for the post creation button
    const postButton = this.getPostCreationButtonLocator(page);
    const isVisible = await postButton.isVisible().catch(() => false);

    if (!isVisible) {
      throw new Error(
        `Group ${groupId} does not exist or is not accessible by this account`,
      );
    }

    // Extract title
    const rawTitle = await page.title();
    const cleanTitle = rawTitle.replace(/(^\(\d+?\)|\| Facebook$)/g, '').trim();

    // Extract cover image (best-effort)
    let imageBuffer: Buffer | null = null;
    try {
      const imgLocator = page.locator(
        'img[data-imgperflogname=profileCoverPhoto]',
      );
      const imgSrc = await imgLocator.getAttribute('src');
      if (imgSrc) {
        const imageUrl = imgSrc.startsWith('/')
          ? new URL(imgSrc, page.url()).href
          : imgSrc;
        // Fetch image via page context to leverage cookies
        const response = await page.context().request.get(imageUrl);
        if (response.ok()) {
          imageBuffer = await response.body();
        }
      }
    } catch {
      // Image extraction is best-effort; continue without it
    }

    return { groupId, title: cleanTitle, imageBuffer };
  }

  /**
   * Checks if the account can post in the group.
   */
  async canPost(
    accountId: string,
    groupId: string,
    session: SessionState,
  ): Promise<boolean> {
    const page = await this.navigateToGroup(accountId, groupId, session);
    return this.getPostCreationButtonLocator(page)
      .isVisible()
      .catch(() => false);
  }

  /**
   * Locator for the "Write something..." / post creation button on group pages.
   */
  private getPostCreationButtonLocator(page: Page) {
    return page.locator(
      'div[class="x1i10hfl x1ejq31n x18oe1m7 x1sy0etr xstzfhl x972fbf x10w94by x1qhh985 x14e42zd x9f619 x1ypdohk x3ct3a4 xdj266r x14z9mp xat24cr x1lziwak x16tdsg8 x1hl2dhg xggy1nq x87ps6o x1lku1pv x1a2a7pz x6s0dn4 xmjcpbm x12ol6y4 x180vkcf x1khw62d x709u02 x78zum5 x1q0g3np x1iyjqo2 x1nhvcw1 x1n2onr6 xt7dq6l x1ba4aug x1y1aw1k xpdmqnj xwib8y2 x1g0dm76"]',
    );
  }
}
