import { describe, expect, it } from 'vitest';
import {
  applyLiftedAction,
  capLiftedState,
  createInitialLiftedState,
  diffShallowPatch,
  getEffectiveState,
  patchStep,
  recomputeStates,
} from './lifted-state.js';
import type { LiftedState } from './types.js';

const incrementReducer = (state: unknown, action: unknown): unknown => {
  const count = (state as { count: number }).count;
  const a = action as { type: string };
  if (a.type === 'increment') return { count: count + 1 };
  if (a.type === 'double') return { count: count * 2 };
  if (a.type === 'boom') throw new Error('reducer exploded');
  return state;
};

const reducerStep = (state: unknown, entry: { action: unknown }): unknown => incrementReducer(state, entry.action);

function perform(action: unknown, timestamp = Date.now()): { type: 'PERFORM_ACTION'; action: unknown; timestamp: number } {
  return { type: 'PERFORM_ACTION', action, timestamp };
}

describe('createInitialLiftedState', () => {
  it('starts with no history and currentStateIndex -1', () => {
    const ls = createInitialLiftedState({ count: 0 });
    expect(ls.committedState).toEqual({ count: 0 });
    expect(ls.stagedActionIds).toEqual([]);
    expect(ls.currentStateIndex).toBe(-1);
    expect(ls.isPaused).toBe(false);
    expect(ls.isLocked).toBe(false);
  });
});

describe('applyLiftedAction PERFORM_ACTION', () => {
  it('appends an action, recomputes, and auto-follows the latest index', () => {
    let ls = createInitialLiftedState({ count: 0 });
    ls = applyLiftedAction(ls, perform({ type: 'increment' }), reducerStep, { count: 0 });
    ls = applyLiftedAction(ls, perform({ type: 'increment' }), reducerStep, { count: 0 });

    expect(ls.stagedActionIds).toHaveLength(2);
    expect(getEffectiveState(ls)).toEqual({ count: 2 });
  });

  it('is a no-op while paused', () => {
    let ls = createInitialLiftedState({ count: 0 });
    ls = applyLiftedAction(ls, { type: 'PAUSE_RECORDING', paused: true }, reducerStep, { count: 0 });
    ls = applyLiftedAction(ls, perform({ type: 'increment' }), reducerStep, { count: 0 });

    expect(ls.stagedActionIds).toHaveLength(0);
    expect(getEffectiveState(ls)).toEqual({ count: 0 });
  });

  it('does not move the viewed index while locked', () => {
    let ls = createInitialLiftedState({ count: 0 });
    ls = applyLiftedAction(ls, perform({ type: 'increment' }), reducerStep, { count: 0 });
    ls = applyLiftedAction(ls, { type: 'JUMP_TO_STATE', index: -1 }, reducerStep, { count: 0 });
    ls = applyLiftedAction(ls, { type: 'LOCK_CHANGES', locked: true }, reducerStep, { count: 0 });
    ls = applyLiftedAction(ls, perform({ type: 'increment' }), reducerStep, { count: 0 });

    expect(ls.currentStateIndex).toBe(-1);
    expect(getEffectiveState(ls)).toEqual({ count: 0 });
    expect(ls.stagedActionIds).toHaveLength(2);
  });

  it('records a reducer error without losing prior state', () => {
    let ls = createInitialLiftedState({ count: 0 });
    ls = applyLiftedAction(ls, perform({ type: 'increment' }), reducerStep, { count: 0 });
    ls = applyLiftedAction(ls, perform({ type: 'boom' }), reducerStep, { count: 0 });

    expect(ls.computedStates[1]?.error).toBe('reducer exploded');
    expect(ls.computedStates[1]?.state).toEqual({ count: 1 });
  });
});

describe('applyLiftedAction TOGGLE_ACTION / SWEEP', () => {
  function threeActions(): LiftedState {
    let ls = createInitialLiftedState({ count: 0 });
    ls = applyLiftedAction(ls, perform({ type: 'increment' }), reducerStep, { count: 0 });
    ls = applyLiftedAction(ls, perform({ type: 'increment' }), reducerStep, { count: 0 });
    ls = applyLiftedAction(ls, perform({ type: 'double' }), reducerStep, { count: 0 });
    return ls;
  }

  it('skipping an action recomputes state as if it never ran', () => {
    let ls = threeActions();
    expect(getEffectiveState(ls)).toEqual({ count: 4 });

    const secondId = ls.stagedActionIds[1] as number;
    ls = applyLiftedAction(ls, { type: 'TOGGLE_ACTION', id: secondId }, reducerStep, { count: 0 });

    expect(getEffectiveState(ls)).toEqual({ count: 2 });
  });

  it('toggling a skipped action again re-includes it', () => {
    let ls = threeActions();
    const secondId = ls.stagedActionIds[1] as number;
    ls = applyLiftedAction(ls, { type: 'TOGGLE_ACTION', id: secondId }, reducerStep, { count: 0 });
    ls = applyLiftedAction(ls, { type: 'TOGGLE_ACTION', id: secondId }, reducerStep, { count: 0 });

    expect(ls.skippedActionIds).toEqual([]);
    expect(getEffectiveState(ls)).toEqual({ count: 4 });
  });

  it('sweep permanently removes skipped actions from history', () => {
    let ls = threeActions();
    const secondId = ls.stagedActionIds[1] as number;
    ls = applyLiftedAction(ls, { type: 'TOGGLE_ACTION', id: secondId }, reducerStep, { count: 0 });
    ls = applyLiftedAction(ls, { type: 'SWEEP' }, reducerStep, { count: 0 });

    expect(ls.stagedActionIds).toHaveLength(2);
    expect(ls.skippedActionIds).toEqual([]);
    expect(getEffectiveState(ls)).toEqual({ count: 2 });
  });
});

describe('applyLiftedAction REVERT / COMMIT / RESET / ROLLBACK', () => {
  it('revert drops the most recently dispatched action', () => {
    let ls = createInitialLiftedState({ count: 0 });
    ls = applyLiftedAction(ls, perform({ type: 'increment' }), reducerStep, { count: 0 });
    ls = applyLiftedAction(ls, perform({ type: 'increment' }), reducerStep, { count: 0 });
    ls = applyLiftedAction(ls, { type: 'REVERT' }, reducerStep, { count: 0 });

    expect(ls.stagedActionIds).toHaveLength(1);
    expect(getEffectiveState(ls)).toEqual({ count: 1 });
  });

  it('commit folds the viewed state into committedState and clears history', () => {
    let ls = createInitialLiftedState({ count: 0 });
    ls = applyLiftedAction(ls, perform({ type: 'increment' }), reducerStep, { count: 0 });
    ls = applyLiftedAction(ls, { type: 'COMMIT' }, reducerStep, { count: 0 });

    expect(ls.committedState).toEqual({ count: 1 });
    expect(ls.stagedActionIds).toEqual([]);
    expect(getEffectiveState(ls)).toEqual({ count: 1 });
  });

  it('reset clears history and returns to the original initial state', () => {
    let ls = createInitialLiftedState({ count: 0 });
    ls = applyLiftedAction(ls, perform({ type: 'increment' }), reducerStep, { count: 0 });
    ls = applyLiftedAction(ls, { type: 'COMMIT' }, reducerStep, { count: 0 });
    ls = applyLiftedAction(ls, perform({ type: 'increment' }), reducerStep, { count: 0 });
    ls = applyLiftedAction(ls, { type: 'RESET' }, reducerStep, { count: 0 });

    expect(getEffectiveState(ls)).toEqual({ count: 0 });
    expect(ls.stagedActionIds).toEqual([]);
  });

  it('rollback clears history but keeps the last committed baseline', () => {
    let ls = createInitialLiftedState({ count: 0 });
    ls = applyLiftedAction(ls, perform({ type: 'increment' }), reducerStep, { count: 0 });
    ls = applyLiftedAction(ls, { type: 'COMMIT' }, reducerStep, { count: 0 });
    ls = applyLiftedAction(ls, perform({ type: 'increment' }), reducerStep, { count: 0 });
    ls = applyLiftedAction(ls, { type: 'ROLLBACK' }, reducerStep, { count: 0 });

    expect(getEffectiveState(ls)).toEqual({ count: 1 });
    expect(ls.stagedActionIds).toEqual([]);
  });
});

describe('applyLiftedAction JUMP_TO_STATE / JUMP_TO_ACTION', () => {
  it('jumps to an arbitrary computed index, including -1 for the committed baseline', () => {
    let ls = createInitialLiftedState({ count: 0 });
    ls = applyLiftedAction(ls, perform({ type: 'increment' }), reducerStep, { count: 0 });
    ls = applyLiftedAction(ls, perform({ type: 'increment' }), reducerStep, { count: 0 });

    ls = applyLiftedAction(ls, { type: 'JUMP_TO_STATE', index: 0 }, reducerStep, { count: 0 });
    expect(getEffectiveState(ls)).toEqual({ count: 1 });

    ls = applyLiftedAction(ls, { type: 'JUMP_TO_STATE', index: -1 }, reducerStep, { count: 0 });
    expect(getEffectiveState(ls)).toEqual({ count: 0 });
  });

  it('jumps to the state produced by a specific action id', () => {
    let ls = createInitialLiftedState({ count: 0 });
    ls = applyLiftedAction(ls, perform({ type: 'increment' }), reducerStep, { count: 0 });
    ls = applyLiftedAction(ls, perform({ type: 'increment' }), reducerStep, { count: 0 });
    const firstId = ls.stagedActionIds[0] as number;

    ls = applyLiftedAction(ls, { type: 'JUMP_TO_ACTION', id: firstId }, reducerStep, { count: 0 });
    expect(getEffectiveState(ls)).toEqual({ count: 1 });
  });
});

describe('applyLiftedAction with an unrecognized command', () => {
  it('returns the lifted state unchanged', () => {
    const ls = createInitialLiftedState({ count: 0 });
    const unknownAction = { type: 'NOT_A_REAL_COMMAND' } as unknown as Parameters<typeof applyLiftedAction>[1];

    expect(applyLiftedAction(ls, unknownAction, reducerStep, { count: 0 })).toBe(ls);
  });
});

describe('recomputeStates', () => {
  it('clamps currentStateIndex to the new computedStates length', () => {
    let ls = createInitialLiftedState({ count: 0 });
    ls = applyLiftedAction(ls, perform({ type: 'increment' }), reducerStep, { count: 0 });
    ls = applyLiftedAction(ls, perform({ type: 'increment' }), reducerStep, { count: 0 });
    ls = { ...ls, currentStateIndex: 1, stagedActionIds: ls.stagedActionIds.slice(0, 1) };

    const recomputed = recomputeStates(ls, reducerStep);
    expect(recomputed.currentStateIndex).toBe(0);
  });
});

describe('diffShallowPatch / patchStep', () => {
  it('captures changed and removed keys', () => {
    const patch = diffShallowPatch({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 });
    expect(patch).toEqual({ b: 3, c: 4 });
  });

  it('marks removed keys as undefined', () => {
    const patch = diffShallowPatch({ a: 1, b: 2 }, { a: 1 });
    expect(patch).toEqual({ b: undefined });
  });

  it('patchStep merges a recorded patch onto the previous state', () => {
    const next = patchStep({ count: 1, name: 'a' }, { id: 0, action: {}, timestamp: 0, meta: { patch: { count: 2 } } });
    expect(next).toEqual({ count: 2, name: 'a' });
  });

  it('round-trips through replay: merging every patch in order reproduces the final state', () => {
    const states = [{ count: 0 }, { count: 1 }, { count: 1, label: 'x' }, { count: 2, label: 'x' }];
    let ls = createInitialLiftedState(states[0]);
    for (let i = 1; i < states.length; i += 1) {
      const patch = diffShallowPatch(states[i - 1], states[i]);
      ls = applyLiftedAction(
        ls,
        { type: 'PERFORM_ACTION', action: { type: `step-${i.toString()}` }, timestamp: i, meta: { patch } },
        patchStep,
        states[0],
      );
    }
    expect(getEffectiveState(ls)).toEqual(states.at(-1));
  });
});

describe('capLiftedState', () => {
  it('folds overflow actions into the committed baseline', () => {
    let ls = createInitialLiftedState({ count: 0 });
    for (let i = 0; i < 5; i += 1) {
      ls = applyLiftedAction(ls, perform({ type: 'increment' }), reducerStep, { count: 0 });
    }
    const capped = capLiftedState(ls, 3);

    expect(capped.stagedActionIds).toHaveLength(3);
    expect(capped.committedState).toEqual({ count: 2 });
    expect(getEffectiveState(capped)).toEqual({ count: 5 });
  });

  it('returns the input unchanged when within bounds', () => {
    const ls = createInitialLiftedState({ count: 0 });
    expect(capLiftedState(ls, 200)).toBe(ls);
  });
});
