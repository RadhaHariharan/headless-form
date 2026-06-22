import type { WatchHandler } from '../types/watch.types.js';
import type { WatchPayload } from '../types/watch.types.js';

/**
 * A registry of per-path `watch` subscribers.
 *
 * @remarks
 * Each call to `form.watch(path, handler)` adds an entry here.
 * When a value changes, the registry's `notify` method is called with the path and payload,
 * which in turn calls all matching handlers (and ancestor handlers when `cascadeUpdates` is true).
 */
export interface WatchRegistry {
  /**
   * Registers a handler for changes at `path`.
   *
   * @param path - Dot-notation path to watch.
   * @param handler - Called whenever the field's value changes.
   * @returns An unsubscribe function.
   */
  subscribe(path: string, handler: WatchHandler<unknown>): () => void;

  /**
   * Notifies all handlers registered for `path`.
   * When `cascade` is `true`, also notifies handlers registered on ancestor paths.
   *
   * @param path - The dot-notation path that changed.
   * @param payload - The change payload.
   * @param cascade - Whether to cascade to ancestor paths.
   */
  notify(path: string, payload: WatchPayload<unknown>, cascade: boolean): void;
}

/**
 * Creates a new {@link WatchRegistry}.
 *
 * @returns A mutable watch registry instance.
 */
export function createWatchRegistry(): WatchRegistry {
  const subscribers = new Map<string, Set<WatchHandler<unknown>>>();

  return {
    subscribe(path, handler) {
      let set = subscribers.get(path);
      if (!set) {
        set = new Set();
        subscribers.set(path, set);
      }
      set.add(handler);

      return () => {
        set?.delete(handler);
        if (set?.size === 0) {
          subscribers.delete(path);
        }
      };
    },

    notify(path, payload, cascade) {
      const handlers = subscribers.get(path);
      if (handlers) {
        for (const handler of handlers) {
          handler(payload);
        }
      }

      if (cascade) {
        const segments = path.split('.');
        for (let i = segments.length - 1; i > 0; i--) {
          const ancestorPath = segments.slice(0, i).join('.');
          const ancestorHandlers = subscribers.get(ancestorPath);
          if (ancestorHandlers) {
            for (const handler of ancestorHandlers) {
              handler(payload);
            }
          }
        }
      }
    },
  };
}
