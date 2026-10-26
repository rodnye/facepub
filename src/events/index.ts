import { EventEmitter } from 'node:events';

/**
 * Event constants emitted by FacebookClient.
 */
export const FacepubEvents = {
  AUTH_FAILED: 'auth:failed',
  AUTH_SUCCESS: 'auth:success',
  POST_CREATED: 'post:created',
  POST_DELETED: 'post:deleted',
  POST_FAILED: 'post:failed',
  SESSION_SAVED: 'session:saved',
  BROWSER_LAUNCHED: 'browser:launched',
  BROWSER_CLOSED: 'browser:closed',
} as const;

export class AuthFailedEvent {
  constructor(
    public readonly accountId: string,
    public readonly reason?: string,
  ) {}
}

export class PostCreatedEvent {
  constructor(
    public readonly postId: string,
    public readonly groupId: string,
  ) {}
}

export class SessionSavedEvent {
  constructor(public readonly accountId: string) {}
}

/**
 * Typed event emitter for facepub lifecycle events.
 */
export class FacepubEventEmitter extends EventEmitter {
  emitAuthFailed(accountId: string, reason?: string): void {
    this.emit(
      FacepubEvents.AUTH_FAILED,
      new AuthFailedEvent(accountId, reason),
    );
  }

  emitAuthSuccess(accountId: string): void {
    this.emit(FacepubEvents.AUTH_SUCCESS, { accountId });
  }

  emitPostCreated(postId: string, groupId: string): void {
    this.emit(
      FacepubEvents.POST_CREATED,
      new PostCreatedEvent(postId, groupId),
    );
  }

  emitPostDeleted(postId: string, groupId: string): void {
    this.emit(FacepubEvents.POST_DELETED, { postId, groupId });
  }

  emitPostFailed(groupId: string, error: Error): void {
    this.emit(FacepubEvents.POST_FAILED, { groupId, error });
  }

  emitSessionSaved(accountId: string): void {
    this.emit(FacepubEvents.SESSION_SAVED, new SessionSavedEvent(accountId));
  }
}
