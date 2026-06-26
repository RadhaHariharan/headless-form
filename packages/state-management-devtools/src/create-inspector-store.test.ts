import { describe, expect, it, vi } from 'vitest';
import { createInspectorStore } from './create-inspector-store.js';
import type { LiftedAction, LiftedState } from './types.js';

const reducerStep = (state: unknown, entry: { action: unknown }): unknown => {
  const count = (state as { count: number }).count;
  const a = entry.action as { type: string };
  return a.type === 'increment' ? { count: count + 1 } : state;
};

describe('createInspectorStore', () => {
  it('starts empty', () => {
    const store = createInspectorStore();
    expect(store.getSnapshot()).toEqual({ connections: {} });
  });

  it('registerConnection seeds a connection with no history', () => {
    const store = createInspectorStore();
    store.registerConnection('a', { count: 0 }, reducerStep);

    expect(store.getSnapshot().connections.a?.committedState).toEqual({ count: 0 });
    expect(store.getSnapshot().connections.a?.stagedActionIds).toEqual([]);
  });

  it('a connection handle records actions without notifying the control listener', () => {
    const store = createInspectorStore();
    const handle = store.registerConnection('a', { count: 0 }, reducerStep);
    const controlListener = vi.fn();
    store.setControlListener('a', controlListener);

    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: Date.now() });

    expect(store.getSnapshot().connections.a?.stagedActionIds).toHaveLength(1);
    expect(controlListener).not.toHaveBeenCalled();
  });

  it('public control methods (jumpToState, sweep, commit, ...) notify the control listener', () => {
    const store = createInspectorStore();
    const handle = store.registerConnection('a', { count: 0 }, reducerStep);
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: Date.now() });

    const controlListener = vi.fn();
    store.setControlListener('a', controlListener);

    store.jumpToState('a', -1);

    expect(controlListener).toHaveBeenCalledTimes(1);
    const [liftedState, action] = controlListener.mock.calls[0] as [LiftedState, LiftedAction];
    expect(action).toEqual({ type: 'JUMP_TO_STATE', index: -1 });
    expect(liftedState.currentStateIndex).toBe(-1);
  });

  it('reset/rollback/revert/sweep/commit/pause/lock/importState all route to the registered connection', () => {
    const store = createInspectorStore();
    const handle = store.registerConnection('a', { count: 0 }, reducerStep);
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: Date.now() });

    store.pause('a', true);
    expect(store.getSnapshot().connections.a?.isPaused).toBe(true);

    store.lock('a', true);
    expect(store.getSnapshot().connections.a?.isLocked).toBe(true);
    store.lock('a', false);
    expect(store.getSnapshot().connections.a?.isLocked).toBe(false);

    store.commit('a');
    expect(store.getSnapshot().connections.a?.committedState).toEqual({ count: 1 });

    store.reset('a');
    expect(store.getSnapshot().connections.a?.committedState).toEqual({ count: 0 });
  });

  it('rollback clears history while keeping the committed baseline', () => {
    const store = createInspectorStore();
    const handle = store.registerConnection('a', { count: 0 }, reducerStep);
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: Date.now() });
    store.commit('a');
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: Date.now() });

    store.rollback('a');

    expect(store.getSnapshot().connections.a?.stagedActionIds).toEqual([]);
    expect(store.getSnapshot().connections.a?.committedState).toEqual({ count: 1 });
  });

  it('revert drops the most recent action', () => {
    const store = createInspectorStore();
    const handle = store.registerConnection('a', { count: 0 }, reducerStep);
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: Date.now() });
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: Date.now() });

    store.revert('a');

    expect(store.getSnapshot().connections.a?.stagedActionIds).toHaveLength(1);
  });

  it('sweep removes skipped actions, and toggleAction/jumpToAction target a specific id', () => {
    const store = createInspectorStore();
    const handle = store.registerConnection('a', { count: 0 }, reducerStep);
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: Date.now() });
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: Date.now() });
    const firstId = store.getSnapshot().connections.a?.stagedActionIds[0] as number;

    store.toggleAction('a', firstId);
    expect(store.getSnapshot().connections.a?.skippedActionIds).toEqual([firstId]);

    store.jumpToAction('a', firstId);
    expect(store.getSnapshot().connections.a?.currentStateIndex).toBe(0);

    store.sweep('a');
    expect(store.getSnapshot().connections.a?.stagedActionIds).toHaveLength(1);
  });

  it('importState replaces a connection wholesale', () => {
    const store = createInspectorStore();
    store.registerConnection('a', { count: 0 }, reducerStep);
    const imported = {
      actionsById: {},
      stagedActionIds: [],
      skippedActionIds: [],
      committedState: { count: 9 },
      computedStates: [],
      currentStateIndex: -1,
      nextActionId: 0,
      isLocked: false,
      isPaused: false,
    };

    store.importState('a', imported);

    expect(store.getSnapshot().connections.a?.committedState).toEqual({ count: 9 });
  });

  it('a control method targeting an unregistered connection is a safe no-op', () => {
    const store = createInspectorStore();
    expect(() => {
      store.jumpToState('missing', 0);
    }).not.toThrow();
  });

  it('clear(name) removes one connection; clear() removes every connection', () => {
    const store = createInspectorStore();
    store.registerConnection('a', { count: 0 }, reducerStep);
    store.registerConnection('b', { count: 0 }, reducerStep);

    store.clear('a');
    expect(Object.keys(store.getSnapshot().connections)).toEqual(['b']);

    store.clear();
    expect(store.getSnapshot().connections).toEqual({});
  });

  it('caps staged actions per connection, folding overflow into the committed baseline', () => {
    const store = createInspectorStore(2);
    const handle = store.registerConnection('a', { count: 0 }, reducerStep);
    for (let i = 0; i < 5; i += 1) {
      handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: i });
    }

    expect(store.getSnapshot().connections.a?.stagedActionIds).toHaveLength(2);
  });

  it('subscribe notifies on every change and unsubscribe stops further notifications', () => {
    const store = createInspectorStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    const handle = store.registerConnection('a', { count: 0 }, reducerStep);
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    listener.mockClear();
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: 0 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('setControlListener(name, undefined) removes a previously registered listener', () => {
    const store = createInspectorStore();
    store.registerConnection('a', { count: 0 }, reducerStep);
    const controlListener = vi.fn();
    store.setControlListener('a', controlListener);
    store.setControlListener('a', undefined);

    store.jumpToState('a', -1);
    expect(controlListener).not.toHaveBeenCalled();
  });
});
