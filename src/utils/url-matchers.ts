/**
 * URL parsing and construction utilities for Facebook entities.
 */

/**
 * Builds the canonical URL for a Facebook group.
 */
export function buildGroupUrl(groupId: string): string {
  return `https://www.facebook.com/groups/${groupId}`;
}

/**
 * Builds the canonical URL for a post within a group.
 */
export function buildPostUrl(groupId: string, postId: string): string {
  return `https://www.facebook.com/groups/${groupId}/posts/${postId}`;
}

/**
 * Builds the canonical URL for a user profile.
 */
export function buildProfileUrl(userId: string): string {
  return `https://www.facebook.com/profile.php?id=${userId}`;
}

/**
 * Extracts a group ID from a Facebook group URL or raw ID string.
 *
 * @example
 * matchGroupId('https://www.facebook.com/groups/123456') // '123456'
 * matchGroupId('123456') // '123456'
 */
export function matchGroupId(input: string): string | undefined {
  return /^(?:https?:\/\/)?(?:www\.)?facebook\.com\/groups\/([^\/\?\s]+)$|^([^\/\?\s]+)$/
    .exec(input)
    ?.slice(1)
    .find(Boolean);
}

/**
 * Extracts a post ID from a URL or raw string.
 * Post IDs are numeric strings of 10+ digits.
 *
 * @example
 * matchPostId('https://www.facebook.com/groups/123/posts/9876543210') // '9876543210'
 */
export function matchPostId(input: string): string | undefined {
  return /(\/posts\/|^)(\d{10,})/.exec(input)?.[2];
}

/**
 * Extracts a comment ID from a URL query parameter or raw string.
 *
 * @example
 * matchCommentId('?comment_id=1234567890') // '1234567890'
 */
export function matchCommentId(input: string): string | undefined {
  return /(\?{0,1}comment_id=|^)(\d{10,})/.exec(input)?.[2];
}

/**
 * Extracts a user ID from a Facebook user/profile URL.
 */
export function matchUserId(input: string): string | undefined {
  return /^(?:https?:\/\/)?(?:www\.)?facebook\.com\/user\/([^\/\?\s]+)$|^([^\/\?\s]+)$/
    .exec(input)
    ?.slice(1)
    .find(Boolean);
}
