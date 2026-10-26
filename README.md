# facepub

A lightweight, framework-agnostic TypeScript library for automating Facebook group interactions via Playwright.

## Features

- Session-based Facebook authentication (manual & automated)
- Create posts in Facebook groups (text + images)
- Delete posts from groups
- Scrape group metadata (title, cover image)
- Navigate groups and posts with retry logic
- Anti-detection browser fingerprinting
- Event-driven architecture for lifecycle hooks

## Installation

```bash
pnpm add github:rodnye/facepub#latest playwright
```

## Quick Start

```ts
import { FacebookClient, BrowserConfig } from '@rodny/facepub';

const client = new FacebookClient({
  headless: false,
  viewport: { width: 1280, height: 720 },
});

// Initialize browser
await client.launch();

// Authenticate (opens browser for manual login if needed)
const session = await client.authenticate({
  accountId: '100092345907832',
  email: 'user@gmail.com',
  password: 'secret',
});

// Create a post in a group
const post = await client.createPost({
  accountId: '100092345907832',
  groupId: '123456789',
  message: 'Hello from @rodny/facepub! 🚀',
  files: [], // optional image paths or buffers
  session,
});

console.log(`Post created: ${post.url}`);

// Cleanup
await client.close();
```

## Architecture (POM)

```
FacebookClient (orchestrator)
├── BrowserManager (Playwright lifecycle)
├── LoginPage       (authentication flows)
├── GroupPage       (group navigation & scraping)
├── PostPage        (post creation & deletion)
└── Events          (lifecycle hooks)
```

## API Reference

### `FacebookClient`

| Method                  | Description                                    |
| ----------------------- | ---------------------------------------------- |
| `launch()`              | Start the browser instance                     |
| `close()`               | Close all sessions and browser                 |
| `authenticate(opts)`    | Authenticate an account, returns session state |
| `createPost(opts)`      | Create a post in a group                       |
| `deletePost(opts)`      | Delete a post from a group                     |
| `scrapeGroup(opts)`     | Get group metadata                             |
| `getSession(accountId)` | Get existing page for a session                |

### `BrowserConfig`

```ts
interface BrowserConfig {
  headless?: boolean;
  executablePath?: string;
  viewport?: { width: number; height: number };
  userAgent?: string;
  antiDetection?: boolean;
}
```

### Events

```ts
import { FacepubEvents } from '@rodny/facepub';

client.on(FacepubEvents.AUTH_FAILED, ({ accountId }) => { ... });
client.on(FacepubEvents.POST_CREATED, ({ postId, groupId }) => { ... });
client.on(FacepubEvents.SESSION_SAVED, ({ accountId }) => { ... });
```

## License

MIT
