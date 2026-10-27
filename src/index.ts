// Main entry point — public API surface
export { FacebookClient } from './client/facebook-client';
export { BrowserManager } from './browser/browser-manager';
export { LoginPage } from './pages/login.page';
export { GroupPage } from './pages/group.page';
export { PostPage } from './pages/post.page';
export { BasePage } from './pages/base.page';

export {
  FacepubEvents,
  AuthFailedEvent,
  PostCreatedEvent,
  SessionSavedEvent,
} from './events';

export type {
  BrowserConfig,
  AccountCredentials,
  SessionState,
  CreatePostOptions,
  DeletePostOptions,
  ScrapeGroupOptions,
  ScrapeGroupResult,
  PostResult,
  FacepubConfig,
} from './types';

export {
  matchGroupId,
  matchPostId,
  matchCommentId,
  buildGroupUrl,
  buildPostUrl,
} from './utils/url-matchers';
