import type { ActionEntry, ComputedState, LiftedAction, LiftedState, StepFn } from './types.js';

/**
 * Builds the empty lifted state a connection starts from (or returns to on `reset`).
 * @param committedState - The baseline state to replay actions on top of.
 * @returns A fresh `LiftedState` with no history.
 */
export function createInitialLiftedState(committedState: unknown): LiftedState {
  return {
    actionsById: {},
    stagedActionIds: [],
    skippedActionIds: [],
    committedState,
    computedStates: [],
    currentStateIndex: -1,
    nextActionId: 0,
    isLocked: false,
    isPaused: false,
  };
}

/**
 * Replays every non-skipped staged action through `step`, starting from `committedState`.
 * @param liftedState - The lifted state to recompute.
 * @param step - Computes the next state from the previous state and a recorded entry.
 * @returns A new `LiftedState` with `computedStates` rebuilt and `currentStateIndex` clamped in range.
 */
export function recomputeStates(liftedState: LiftedState, step: StepFn): LiftedState {
  let state = liftedState.committedState;
  const computedStates: ComputedState[] = [];
  for (const id of liftedState.stagedActionIds) {
    const entry = liftedState.actionsById[id];
    if (entry === undefined) continue;
    if (!liftedState.skippedActionIds.includes(id)) {
      try {
        state = step(state, entry);
      } catch (error) {
        computedStates.push({ state, error: error instanceof Error ? error.message : String(error) });
        continue;
      }
    }
    computedStates.push({ state });
  }
  const maxIndex = computedStates.length - 1;
  const currentStateIndex =
    liftedState.currentStateIndex === -1 ? -1 : Math.min(liftedState.currentStateIndex, maxIndex);
  return { ...liftedState, computedStates, currentStateIndex };
}

/**
 * Reads the state a UI should currently display for a connection.
 * @param liftedState - The lifted state to read.
 * @returns `committedState` when no action is being viewed, otherwise the computed state at `currentStateIndex`.
 */
export function getEffectiveState(liftedState: LiftedState): unknown {
  if (liftedState.currentStateIndex === -1) return liftedState.committedState;
  return liftedState.computedStates[liftedState.currentStateIndex]?.state ?? liftedState.committedState;
}

function withoutActionId(
  actionsById: Record<number, ActionEntry>,
  excludeIds: readonly number[],
): Record<number, ActionEntry> {
  return Object.fromEntries(
    Object.entries(actionsById).filter(([id]) => !excludeIds.includes(Number(id))),
  ) as Record<number, ActionEntry>;
}

/**
 * Applies a single control or recording command to a connection's lifted state — the same
 * "lifted reducer" technique real Redux DevTools time-travel is built on.
 * @param liftedState - The current lifted state.
 * @param action - The command to apply.
 * @param step - Computes the next state from the previous state and a recorded entry.
 * @param initialCommittedState - The connection's original baseline, used by `reset`.
 * @returns The next lifted state.
 */
export function applyLiftedAction(
  liftedState: LiftedState,
  action: LiftedAction,
  step: StepFn,
  initialCommittedState: unknown,
): LiftedState {
  switch (action.type) {
    case 'PERFORM_ACTION': {
      if (liftedState.isPaused) return liftedState;
      const id = liftedState.nextActionId;
      const entry: ActionEntry =
        action.meta === undefined
          ? { id, action: action.action, timestamp: action.timestamp }
          : { id, action: action.action, timestamp: action.timestamp, meta: action.meta };
      const next: LiftedState = {
        ...liftedState,
        actionsById: { ...liftedState.actionsById, [id]: entry },
        stagedActionIds: [...liftedState.stagedActionIds, id],
        nextActionId: id + 1,
        currentStateIndex: liftedState.isLocked
          ? liftedState.currentStateIndex
          : liftedState.stagedActionIds.length,
      };
      return recomputeStates(next, step);
    }
    case 'RESET':
      return createInitialLiftedState(initialCommittedState);
    case 'COMMIT':
      return createInitialLiftedState(getEffectiveState(liftedState));
    case 'ROLLBACK':
      return createInitialLiftedState(liftedState.committedState);
    case 'REVERT': {
      const removedId = liftedState.stagedActionIds.at(-1);
      const stagedActionIds = liftedState.stagedActionIds.slice(0, -1);
      const actionsById =
        removedId === undefined ? liftedState.actionsById : withoutActionId(liftedState.actionsById, [removedId]);
      const skippedActionIds = liftedState.skippedActionIds.filter((sid) => sid !== removedId);
      return recomputeStates(
        {
          ...liftedState,
          stagedActionIds,
          actionsById,
          skippedActionIds,
          currentStateIndex: stagedActionIds.length - 1,
        },
        step,
      );
    }
    case 'TOGGLE_ACTION': {
      const skippedActionIds = liftedState.skippedActionIds.includes(action.id)
        ? liftedState.skippedActionIds.filter((id) => id !== action.id)
        : [...liftedState.skippedActionIds, action.id];
      return recomputeStates({ ...liftedState, skippedActionIds }, step);
    }
    case 'SWEEP': {
      const stagedActionIds = liftedState.stagedActionIds.filter(
        (id) => !liftedState.skippedActionIds.includes(id),
      );
      const removedIds = liftedState.stagedActionIds.filter((id) => liftedState.skippedActionIds.includes(id));
      return recomputeStates(
        {
          ...liftedState,
          stagedActionIds,
          actionsById: withoutActionId(liftedState.actionsById, removedIds),
          skippedActionIds: [],
          currentStateIndex: Math.min(liftedState.currentStateIndex, stagedActionIds.length - 1),
        },
        step,
      );
    }
    case 'JUMP_TO_STATE':
      return { ...liftedState, currentStateIndex: action.index };
    case 'JUMP_TO_ACTION':
      return { ...liftedState, currentStateIndex: liftedState.stagedActionIds.indexOf(action.id) };
    case 'IMPORT_STATE':
      return recomputeStates(action.liftedState, step);
    case 'PAUSE_RECORDING':
      return { ...liftedState, isPaused: action.paused };
    case 'LOCK_CHANGES':
      return { ...liftedState, isLocked: action.locked };
    default:
      return liftedState;
  }
}

/**
 * Computes the shallow key-level diff from `prev` to `next`, used as replay metadata for
 * connections (e.g. zustand-style stores) with no reducer to re-run directly.
 * @param prev - The state before the action.
 * @param next - The state after the action.
 * @returns A patch that, shallow-merged onto `prev`, reproduces `next`.
 */
export function diffShallowPatch(prev: unknown, next: unknown): Record<string, unknown> {
  if (typeof next !== 'object' || next === null) return {};
  const nextObj = next as Record<string, unknown>;
  if (typeof prev !== 'object' || prev === null) return { ...nextObj };
  const prevObj = prev as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(nextObj)) {
    if (!Object.is(prevObj[key], nextObj[key])) patch[key] = nextObj[key];
  }
  for (const key of Object.keys(prevObj)) {
    if (!(key in nextObj)) patch[key] = undefined;
  }
  return patch;
}

/**
 * A `StepFn` that shallow-merges an entry's recorded patch onto the previous state — the replay
 * strategy for connections with no reducer (see `diffShallowPatch`).
 * @param state - The previous state.
 * @param entry - The recorded action entry, expected to carry `meta.patch`.
 * @returns The previous state with the entry's patch merged in.
 */
export function patchStep(state: unknown, entry: ActionEntry): unknown {
  const patch = entry.meta?.patch;
  if (patch === undefined || typeof state !== 'object' || state === null) return state;
  return { ...(state as Record<string, unknown>), ...patch };
}

/**
 * Bounds a connection's history so it doesn't grow without limit — overflow is folded into
 * `committedState` (auto-committed), keeping only the most recent `maxActions` staged actions.
 * @param liftedState - The lifted state to cap.
 * @param maxActions - The maximum number of staged actions to retain.
 * @returns The capped lifted state, or the input unchanged if it's already within bounds.
 */
export function capLiftedState(liftedState: LiftedState, maxActions: number): LiftedState {
  if (liftedState.stagedActionIds.length <= maxActions) return liftedState;
  const overflow = liftedState.stagedActionIds.length - maxActions;
  const committedState = liftedState.computedStates[overflow - 1]?.state ?? liftedState.committedState;
  const droppedIds = liftedState.stagedActionIds.slice(0, overflow);
  const stagedActionIds = liftedState.stagedActionIds.slice(overflow);
  const computedStates = liftedState.computedStates.slice(overflow);
  const skippedActionIds = liftedState.skippedActionIds.filter((id) => stagedActionIds.includes(id));
  const currentStateIndex =
    liftedState.currentStateIndex === -1 ? -1 : Math.max(-1, liftedState.currentStateIndex - overflow);
  return {
    ...liftedState,
    committedState,
    stagedActionIds,
    computedStates,
    skippedActionIds,
    actionsById: withoutActionId(liftedState.actionsById, droppedIds),
    currentStateIndex,
  };
}
