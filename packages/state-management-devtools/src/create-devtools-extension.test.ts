import { describe, expect, it, vi } from 'vitest';
import { createDevtoolsExtension } from './create-devtools-extension.js';
import { createInspectorStore } from './create-inspector-store.js';
import { getEffectiveState } from './lifted-state.js';
import type { DevtoolsMessage, GenericStore, GenericStoreCreator, GenericStoreEnhancer } from './types.js';

function createFakeStoreCreator(initialState: unknown): GenericStoreCreator {
  return function fakeCreateStore(reducer, preloadedState): GenericStore {
    let state = preloadedState ?? initialState;
    return {
      dispatch: (action) => {
        state = (reducer as (s: unknown, a: unknown) => unknown)(state, action);
        return action;
      },
      getState: () => state,
      subscribe: () => () => undefined,
    };
  };
}

const incrementReducer = (state: unknown, action: unknown): unknown => {
  const count = (state as { count: number }).count;
  const a = action as { type: string };
  return a.type === 'increment' ? { count: count + 1 } : state;
};

describe('createDevtoolsExtension — connect() (zustand-style, patch replay)', () => {
  it('connect().init/.send build up lifted-state history under the configured name', () => {
    const inspectorStore = createInspectorStore();
    const { extension } = createDevtoolsExtension(inspectorStore);

    const connection = extension.connect({ name: 'my-store' });
    connection.init({ count: 0 });
    connection.send({ type: 'increment' }, { count: 1 });

    const liftedState = inspectorStore.getSnapshot().connections['my-store'];
    expect(liftedState?.stagedActionIds).toHaveLength(1);
    expect(liftedState && getEffectiveState(liftedState)).toEqual({ count: 1 });
  });

  it('connect() without a name auto-generates a distinct connection name', () => {
    const inspectorStore = createInspectorStore();
    const { extension } = createDevtoolsExtension(inspectorStore);

    const a = extension.connect({});
    const b = extension.connect({});
    a.init({});
    b.init({});

    expect(Object.keys(inspectorStore.getSnapshot().connections)).toHaveLength(2);
  });

  it('jumping to a previous state forwards a JUMP_TO_STATE DISPATCH message with the precomputed state', () => {
    const inspectorStore = createInspectorStore();
    const { extension } = createDevtoolsExtension(inspectorStore);
    const connection = extension.connect({ name: 'x' });
    connection.init({ count: 0 });
    connection.send({ type: 'increment' }, { count: 1 });
    connection.send({ type: 'increment' }, { count: 2 });

    const listener = vi.fn((_message: DevtoolsMessage) => undefined);
    connection.subscribe(listener);

    inspectorStore.jumpToState('x', 0);

    expect(listener).toHaveBeenCalledWith({
      type: 'DISPATCH',
      payload: { type: 'JUMP_TO_STATE' },
      state: JSON.stringify({ count: 1 }),
    });
  });

  it('reset/commit/pause forward their literal DISPATCH message with no state payload', () => {
    const inspectorStore = createInspectorStore();
    const { extension } = createDevtoolsExtension(inspectorStore);
    const connection = extension.connect({ name: 'x' });
    connection.init({ count: 0 });

    const listener = vi.fn((_message: DevtoolsMessage) => undefined);
    connection.subscribe(listener);

    inspectorStore.reset('x');
    expect(listener).toHaveBeenLastCalledWith({ type: 'DISPATCH', payload: { type: 'RESET' } });

    inspectorStore.commit('x');
    expect(listener).toHaveBeenLastCalledWith({ type: 'DISPATCH', payload: { type: 'COMMIT' } });

    inspectorStore.pause('x', true);
    expect(listener).toHaveBeenLastCalledWith({ type: 'DISPATCH', payload: { type: 'PAUSE_RECORDING' } });
  });

  it('unsubscribe stops forwarding control messages', () => {
    const inspectorStore = createInspectorStore();
    const { extension } = createDevtoolsExtension(inspectorStore);
    const connection = extension.connect({ name: 'x' });
    connection.init({ count: 0 });

    const listener = vi.fn((_message: DevtoolsMessage) => undefined);
    const unsubscribe = connection.subscribe(listener);
    unsubscribe();

    inspectorStore.reset('x');
    expect(listener).not.toHaveBeenCalled();
  });

  it('connection.unsubscribe() also removes the control listener', () => {
    const inspectorStore = createInspectorStore();
    const { extension } = createDevtoolsExtension(inspectorStore);
    const connection = extension.connect({ name: 'x' });
    connection.init({ count: 0 });

    const listener = vi.fn((_message: DevtoolsMessage) => undefined);
    connection.subscribe(listener);
    connection.unsubscribe();

    inspectorStore.reset('x');
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('createDevtoolsExtension — enhancer-style (reducer replay, true time-travel)', () => {
  it('the callable extension form lifts the store, recording every dispatch', () => {
    const inspectorStore = createInspectorStore();
    const { extension } = createDevtoolsExtension(inspectorStore);

    const enhancer = extension({ name: 'callable' });
    const createStore = enhancer(createFakeStoreCreator({ count: 0 }));
    const store = createStore(incrementReducer, { count: 0 });

    store.dispatch({ type: 'increment' });
    store.dispatch({ type: 'increment' });

    expect(store.getState()).toEqual({ count: 2 });
    expect(inspectorStore.getSnapshot().connections.callable?.stagedActionIds).toHaveLength(2);
  });

  it('jumpToState on the inspector store changes what the live store.getState() returns', () => {
    const inspectorStore = createInspectorStore();
    const { extension } = createDevtoolsExtension(inspectorStore);
    const enhancer = extension({ name: 'time-travel' });
    const createStore = enhancer(createFakeStoreCreator({ count: 0 }));
    const store = createStore(incrementReducer, { count: 0 });

    store.dispatch({ type: 'increment' });
    store.dispatch({ type: 'increment' });
    expect(store.getState()).toEqual({ count: 2 });

    inspectorStore.jumpToState('time-travel', 0);
    expect(store.getState()).toEqual({ count: 1 });
  });

  it('subscribers are notified after a real dispatch, and unsubscribing stops further notifications', () => {
    const inspectorStore = createInspectorStore();
    const { extension } = createDevtoolsExtension(inspectorStore);
    const enhancer = extension({ name: 'notify' });
    const createStore = enhancer(createFakeStoreCreator({ count: 0 }));
    const store = createStore(incrementReducer, { count: 0 });

    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.dispatch({ type: 'increment' });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.dispatch({ type: 'increment' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('skipping an action recomputes live state as if it never happened', () => {
    const inspectorStore = createInspectorStore();
    const { extension } = createDevtoolsExtension(inspectorStore);
    const enhancer = extension({ name: 'skip' });
    const createStore = enhancer(createFakeStoreCreator({ count: 0 }));
    const store = createStore(incrementReducer, { count: 0 });

    store.dispatch({ type: 'increment' });
    store.dispatch({ type: 'increment' });
    const firstId = inspectorStore.getSnapshot().connections.skip?.stagedActionIds[0] as number;

    inspectorStore.toggleAction('skip', firstId);
    expect(store.getState()).toEqual({ count: 1 });
  });

  it('compose(config)(...enhancers) appends the devtools enhancer innermost', () => {
    const inspectorStore = createInspectorStore();
    const { compose } = createDevtoolsExtension(inspectorStore);

    const order: string[] = [];
    const markerEnhancer = (next: GenericStoreCreator): GenericStoreCreator =>
      (reducer, preloadedState, enhancer) => {
        order.push('marker');
        return next(reducer, preloadedState, enhancer);
      };

    const composed = compose({ name: 'composed' })(markerEnhancer);
    const createStore = composed(createFakeStoreCreator({ count: 0 }));
    const store = createStore(incrementReducer, { count: 0 });
    store.dispatch({ type: 'increment' });

    expect(order).toEqual(['marker']);
    expect(inspectorStore.getSnapshot().connections.composed?.stagedActionIds).toHaveLength(1);
  });

  it('compose(...enhancers) called directly (no config) still wires up recording', () => {
    const inspectorStore = createInspectorStore();
    const { compose } = createDevtoolsExtension(inspectorStore);

    const passthroughEnhancer: GenericStoreEnhancer = (next) => next;
    const enhancer = compose(passthroughEnhancer);
    const createStore = enhancer(createFakeStoreCreator({ count: 0 }));
    const store = createStore(incrementReducer, { count: 0 });
    store.dispatch({ type: 'increment' });

    expect(Object.keys(inspectorStore.getSnapshot().connections)).toHaveLength(1);
  });
});
