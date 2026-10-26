import type { Page } from 'playwright';
import type {
  CreatePostOptions,
  DeletePostOptions,
  PostResult,
  PostFile,
  SessionState,
} from '../types';
import { BasePage } from './base.page';
import {
  buildGroupUrl,
  buildPostUrl,
  matchPostId,
  matchGroupId,
} from '../utils/url-matchers';

/**
 * Page Object for Facebook post interactions within groups.
 * Handles post creation (text + images) and deletion.
 */
export class PostPage extends BasePage {
  /**
   * Creates a post in a Facebook group.
   * Supports text messages and image attachments.
   */
  async createPost(options: CreatePostOptions): Promise<PostResult> {
    const { accountId, groupId, message, files = [], session } = options;

    // Navigate to group
    const page = await this.getPage(accountId, session);
    await this.navigateWithRetry(page, buildGroupUrl(groupId));

    // Open post creation modal
    await this.clickPostButton(page);

    // Wait for the contenteditable area
    const editor = page.locator('[role="dialog"] [contenteditable="true"]');
    await editor.waitFor({ state: 'visible', timeout: this.defaultTimeout });

    // Type message
    await editor.fill(message);

    // Attach files if provided
    if (files.length > 0) {
      await this.attachFiles(page, files);
    }

    // Publish
    await this.clickPublish(page);

    // Wait for publication to complete
    await this.waitForPublication(page);

    // Extract post URL
    const postUrl = await this.extractPostUrl(page);
    const postId = matchPostId(postUrl);

    if (!postId) {
      throw new Error('Could not extract post ID from URL: ' + postUrl);
    }

    return { postId, groupId, url: postUrl };
  }

  /**
   * Deletes a post from a Facebook group.
   */
  async deletePost(options: DeletePostOptions): Promise<void> {
    const { accountId, groupId, postId, session } = options;

    const page = await this.getPage(accountId, session);
    const postUrl = buildPostUrl(groupId, postId);
    await this.navigateWithRetry(page, postUrl);

    // Open post actions menu
    await page
      .locator('[role=dialog] [aria-label="Acciones para esta publicación"]')
      .click();

    // Click delete option
    await page.locator('text=Eliminar publicación').click();

    // Confirm deletion
    await page.locator('[role=dialog] [aria-label="Eliminar"]').click();

    // Wait for deletion to process
    await page.waitForTimeout(3000);
  }

  /**
   * Clicks the post creation button on the group page.
   */
  private async clickPostButton(page: Page): Promise<void> {
    const button = page.locator(
      'div[class="x1i10hfl x1ejq31n x18oe1m7 x1sy0etr xstzfhl x972fbf x10w94by x1qhh985 x14e42zd x9f619 x1ypdohk x3ct3a4 xdj266r x14z9mp xat24cr x1lziwak x16tdsg8 x1hl2dhg xggy1nq x87ps6o x1lku1pv x1a2a7pz x6s0dn4 xmjcpbm x12ol6y4 x180vkcf x1khw62d x709u02 x78zum5 x1q0g3np x1iyjqo2 x1nhvcw1 x1n2onr6 xt7dq6l x1ba4aug x1y1aw1k xpdmqnj xwib8y2 x1g0dm76"]',
    );
    await button.click();
  }

  /**
   * Attaches image files to the post dialog.
   */
  private async attachFiles(page: Page, files: PostFile[]): Promise<void> {
    const input = page.locator('[role="dialog"] input[type="file"]');

    const hasPaths = files.every((f) => f.path);

    if (hasPaths) {
      // Disk-based files
      await input.setInputFiles(files.map((f) => f.path!));
    } else {
      // Memory-based buffers
      await input.setInputFiles(
        files.map((f) => ({
          buffer: f.buffer!,
          mimeType: f.mimeType ?? 'image/jpeg',
          name: f.originalName ?? 'image.jpg',
        })),
      );
    }

    // Wait for upload processing
    await page.waitForTimeout(3000);
  }

  /**
   * Clicks the publish/submit button in the post dialog.
   */
  private async clickPublish(page: Page): Promise<void> {
    // Try Spanish label first, then English
    const publishBtn = page.locator(
      '[role="dialog"] [aria-label="Publicar"], [role="dialog"] [aria-label="Post"]',
    );
    await publishBtn.first().click();
  }

  /**
   * Waits for the "Publishing..." indicator to disappear.
   */
  private async waitForPublication(page: Page): Promise<void> {
    await page.waitForTimeout(2000);

    try {
      await page
        .locator('text=Publicando')
        .first()
        .waitFor({ state: 'detached', timeout: 30000 });
    } catch {
      // "Publicando" may not appear for very fast posts
    }

    await page.waitForTimeout(2000);
  }

  /**
   * Extracts the post URL from the success dialog.
   * The href only resolves correctly when the element is hovered/focused.
   */
  private async extractPostUrl(page: Page): Promise<string> {
    const selector =
      'span[class="html-span xdj266r x14z9mp xat24cr x1lziwak xexx8yu xyri2b x18d9i69 x1c1uobl x1hl2dhg x16tdsg8 x1vvkbs"] a[class="x1i10hfl xjbqb8w x1ejq31n x18oe1m7 x1sy0etr xstzfhl x972fbf x10w94by x1qhh985 x14e42zd x9f619 x1ypdohk xt0psk2 x3ct3a4 xdj266r x14z9mp xat24cr x1lziwak xexx8yu xyri2b x18d9i69 x1c1uobl x16tdsg8 x1hl2dhg xggy1nq x1a2a7pz xkrqix3 x1sur9pj xi81zsa x1s688f"]';

    let postUrl: string | null = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (!postUrl && attempts < maxAttempts) {
      attempts++;
      const linkEl = await page.waitForSelector(selector, { timeout: 10000 });

      if (!linkEl) {
        throw new Error(
          'Post link element not found. Facebook may have changed its HTML structure.',
        );
      }

      // The href is only populated on hover/focus
      await linkEl.focus();
      await linkEl.hover();
      postUrl = await linkEl.evaluate((el) => el.getAttribute('href'));

      if (postUrl && !postUrl.startsWith('https://www')) {
        postUrl = null; // URL not ready yet
        await page.waitForTimeout(1000);
      }
    }

    if (!postUrl) {
      throw new Error('Could not extract post URL after multiple attempts');
    }

    return postUrl;
  }
}
