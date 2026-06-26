import { useSyncExternalStore } from 'react';
import type { DockStateSnapshot, DockStore } from '@headlesskit/state-management-devtools';

/**
 * Subscribes to a `DockStore`, re-rendering the calling component on every state change.
 * @param dockStore - The dock store to read from.
 * @returns The current dock panel state.
 */
export function useDockSnapshot(dockStore: DockStore): DockStateSnapshot {
  return useSyncExternalStore(dockStore.subscribe, dockStore.getSnapshot, dockStore.getSnapshot);
}
