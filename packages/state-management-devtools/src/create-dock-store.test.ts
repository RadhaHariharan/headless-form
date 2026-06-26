import { describe, expect, it, vi } from 'vitest';
import { createDockStore } from './create-dock-store.js';

describe('createDockStore', () => {
  it('defaults to closed, bottom, size 320', () => {
    const dockStore = createDockStore();
    expect(dockStore.getSnapshot()).toEqual({ isOpen: false, position: 'bottom', size: 320 });
  });

  it('accepts initial state overrides', () => {
    const dockStore = createDockStore({ isOpen: true, position: 'right', size: 400 });
    expect(dockStore.getSnapshot()).toEqual({ isOpen: true, position: 'right', size: 400 });
  });

  it('toggle flips isOpen', () => {
    const dockStore = createDockStore();
    dockStore.toggle();
    expect(dockStore.getSnapshot().isOpen).toBe(true);
    dockStore.toggle();
    expect(dockStore.getSnapshot().isOpen).toBe(false);
  });

  it('open and close set isOpen directly', () => {
    const dockStore = createDockStore();
    dockStore.open();
    expect(dockStore.getSnapshot().isOpen).toBe(true);
    dockStore.close();
    expect(dockStore.getSnapshot().isOpen).toBe(false);
  });

  it('setPosition and setSize update their fields independently', () => {
    const dockStore = createDockStore();
    dockStore.setPosition('left');
    dockStore.setSize(500);
    expect(dockStore.getSnapshot()).toEqual({ isOpen: false, position: 'left', size: 500 });
  });

  it('notifies subscribers on every state change', () => {
    const dockStore = createDockStore();
    const listener = vi.fn();
    dockStore.subscribe(listener);

    dockStore.toggle();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('stops notifying after unsubscribe', () => {
    const dockStore = createDockStore();
    const listener = vi.fn();
    const unsubscribe = dockStore.subscribe(listener);
    unsubscribe();

    dockStore.toggle();

    expect(listener).not.toHaveBeenCalled();
  });
});
