import { act, renderHook } from '@testing-library/react';
import { createDockStore } from '@headlesskit/state-management-devtools';
import { describe, expect, it } from 'vitest';
import { useDockSnapshot } from './use-dock-snapshot.js';

describe('useDockSnapshot', () => {
  it('returns the current snapshot and re-renders on changes', () => {
    const dockStore = createDockStore();
    const { result } = renderHook(() => useDockSnapshot(dockStore));

    expect(result.current.isOpen).toBe(false);

    act(() => {
      dockStore.open();
    });

    expect(result.current.isOpen).toBe(true);
  });
});
