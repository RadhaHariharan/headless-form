import { useSyncExternalStore } from 'react';
import type { InspectorSnapshot, InspectorStore } from '@headlesskit/state-management-devtools';

/**
 * Subscribes to an `InspectorStore`, re-rendering the calling component whenever any
 * connection's lifted state changes.
 * @param inspectorStore - The inspector store to read from.
 * @returns The current snapshot of every connection's lifted state.
 */
export function useInspectorSnapshot(inspectorStore: InspectorStore): InspectorSnapshot {
  return useSyncExternalStore(
    inspectorStore.subscribe,
    inspectorStore.getSnapshot,
    inspectorStore.getSnapshot,
  );
}
