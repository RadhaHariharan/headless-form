/** One field's change between two states, as rendered by the Diff tab. */
export interface DiffNode {
  /** The field name (or array index) this node represents. */
  key: string;
  /** Whether the field was added, removed, changed, or identical between the two values. */
  status: 'added' | 'removed' | 'changed' | 'unchanged';
  /** The value before, present unless `status` is `'added'`. */
  prevValue?: unknown;
  /** The value after, present unless `status` is `'removed'`. */
  nextValue?: unknown;
  /** Nested field diffs, present when both values at this key are plain objects or arrays. */
  children?: DiffNode[];
}

function isPlainObjectOrArray(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Recursively diffs two values, producing a tree the Diff tab renders — each node is one field
 * that was added, removed, changed, or left unchanged.
 * @param prev - The value before.
 * @param next - The value after.
 * @returns A diff tree rooted at the top-level fields of `prev`/`next`.
 */
export function computeDiff(prev: unknown, next: unknown): DiffNode[] {
  if (!isPlainObjectOrArray(prev) || !isPlainObjectOrArray(next)) {
    return [{ key: '(root)', status: Object.is(prev, next) ? 'unchanged' : 'changed', prevValue: prev, nextValue: next }];
  }

  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const nodes: DiffNode[] = [];

  for (const key of keys) {
    const hasPrev = key in prev;
    const hasNext = key in next;
    const prevValue = prev[key];
    const nextValue = next[key];

    if (!hasPrev) {
      nodes.push({ key, status: 'added', nextValue });
      continue;
    }
    if (!hasNext) {
      nodes.push({ key, status: 'removed', prevValue });
      continue;
    }
    if (Object.is(prevValue, nextValue)) {
      nodes.push({ key, status: 'unchanged', prevValue, nextValue });
      continue;
    }
    if (isPlainObjectOrArray(prevValue) && isPlainObjectOrArray(nextValue)) {
      nodes.push({ key, status: 'changed', prevValue, nextValue, children: computeDiff(prevValue, nextValue) });
      continue;
    }
    nodes.push({ key, status: 'changed', prevValue, nextValue });
  }

  return nodes;
}

/**
 * Counts how many fields in a diff tree (recursively) are not `'unchanged'`.
 * @param nodes - The diff tree to count.
 * @returns The number of added/removed/changed fields.
 */
export function countChanges(nodes: DiffNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.status !== 'unchanged') count += 1;
    if (node.children) count += countChanges(node.children);
  }
  return count;
}
