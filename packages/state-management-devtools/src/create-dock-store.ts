import type { DockPosition, DockStateSnapshot, DockStore } from './types.js';

/** Initial values for `createDockStore`. */
export interface CreateDockStoreOptions {
  /** Whether the panel starts open. Defaults to `false`. */
  isOpen?: boolean;
  /** Which edge of the viewport the panel starts docked to. Defaults to `'bottom'`. */
  position?: DockPosition;
  /** The panel's starting thickness in pixels. Defaults to `320`. */
  size?: number;
}

const DEFAULT_SIZE = 320;

/**
 * Creates a framework-agnostic store of dock panel UI state (open/closed, position, size).
 * @param options - Initial dock state.
 * @returns A `DockStore` a UI can subscribe to and mutate.
 */
export function createDockStore(options: CreateDockStoreOptions = {}): DockStore {
  let state: DockStateSnapshot = {
    isOpen: options.isOpen ?? false,
    position: options.position ?? 'bottom',
    size: options.size ?? DEFAULT_SIZE,
  };
  const listeners = new Set<() => void>();

  function notify(): void {
    listeners.forEach((listener) => {
      listener();
    });
  }

  function patch(next: Partial<DockStateSnapshot>): void {
    state = { ...state, ...next };
    notify();
  }

  function getSnapshot(): DockStateSnapshot {
    return state;
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return function unsubscribe(): void {
      listeners.delete(listener);
    };
  }

  function toggle(): void {
    patch({ isOpen: !state.isOpen });
  }

  function open(): void {
    patch({ isOpen: true });
  }

  function close(): void {
    patch({ isOpen: false });
  }

  function setPosition(position: DockPosition): void {
    patch({ position });
  }

  function setSize(size: number): void {
    patch({ size });
  }

  return { getSnapshot, subscribe, toggle, open, close, setPosition, setSize };
}
