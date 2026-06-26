import { afterEach, describe, expect, it } from 'vitest';
import { installDevtools } from './install-devtools.js';

afterEach(() => {
  delete window.__HEADLESSKIT_DEVTOOLS_EXTENSION__;
  delete window.__HEADLESSKIT_DEVTOOLS_EXTENSION_COMPOSE__;
});

describe('installDevtools', () => {
  it('returns an inspector store and a dock store', () => {
    const { inspectorStore, dockStore } = installDevtools();
    expect(inspectorStore.getSnapshot()).toEqual({ connections: {} });
    expect(dockStore.getSnapshot()).toEqual({ isOpen: false, position: 'bottom', size: 320 });
  });

  it('populates both window connector globals', () => {
    installDevtools();
    expect(typeof window.__HEADLESSKIT_DEVTOOLS_EXTENSION__).toBe('function');
    expect(typeof window.__HEADLESSKIT_DEVTOOLS_EXTENSION_COMPOSE__).toBe('function');
  });

  it('the installed extension records into the returned inspector store', () => {
    const { inspectorStore } = installDevtools();
    const connection = window.__HEADLESSKIT_DEVTOOLS_EXTENSION__?.connect({ name: 'app' });
    connection?.init({ ready: true });

    expect(inspectorStore.getSnapshot().connections.app?.committedState).toEqual({ ready: true });
  });

  it('respects maxActionsPerConnection and initial dock options', () => {
    const { inspectorStore, dockStore } = installDevtools({
      maxActionsPerConnection: 1,
      dock: { isOpen: true, position: 'left', size: 250 },
    });
    expect(dockStore.getSnapshot()).toEqual({ isOpen: true, position: 'left', size: 250 });

    const connection = window.__HEADLESSKIT_DEVTOOLS_EXTENSION__?.connect({ name: 'capped' });
    connection?.init({ count: 0 });
    connection?.send({ type: 'a' }, { count: 1 });
    connection?.send({ type: 'b' }, { count: 2 });

    expect(inspectorStore.getSnapshot().connections.capped?.stagedActionIds).toHaveLength(1);
  });
});
