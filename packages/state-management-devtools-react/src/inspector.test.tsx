import { fireEvent, render, screen } from '@testing-library/react';
import { createInspectorStore } from '@headlesskit/state-management-devtools';
import { describe, expect, it } from 'vitest';
import { Inspector } from './inspector.js';

const reducerStep = (state: unknown, entry: { action: unknown }): unknown => {
  const count = (state as { count: number }).count;
  const a = entry.action as { type: string };
  if (a.type === 'increment') return { count: count + 1 };
  if (a.type === 'boom') throw new Error('reducer exploded');
  return state;
};

describe('Inspector', () => {
  it('shows a placeholder when no store has connected', () => {
    render(<Inspector inspectorStore={createInspectorStore()} />);
    expect(screen.getByText('No store has connected yet.')).toBeInTheDocument();
  });

  it('defaults to the State tab, showing the current state in Tree view', () => {
    const inspectorStore = createInspectorStore();
    const handle = inspectorStore.registerConnection('a', { count: 0 }, reducerStep);
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: 1 });

    render(<Inspector inspectorStore={inspectorStore} />);

    expect(screen.getByText('count:')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('switches to the Action tab and shows the selected action', () => {
    const inspectorStore = createInspectorStore();
    const handle = inspectorStore.registerConnection('a', { count: 0 }, reducerStep);
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: 1 });

    render(<Inspector inspectorStore={inspectorStore} />);
    fireEvent.click(screen.getByText('Action'));

    expect(screen.getByText('"increment"')).toBeInTheDocument();
  });

  it('switches to Raw view, rendering JSON text instead of the tree', () => {
    const inspectorStore = createInspectorStore();
    const handle = inspectorStore.registerConnection('a', { count: 0 }, reducerStep);
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: 1 });

    render(<Inspector inspectorStore={inspectorStore} />);
    fireEvent.click(screen.getByText('Raw'));

    expect(screen.getByText((content) => content.includes('"count": 1'))).toBeInTheDocument();
  });

  it('shows the Action tab in Raw view as JSON text', () => {
    const inspectorStore = createInspectorStore();
    const handle = inspectorStore.registerConnection('a', { count: 0 }, reducerStep);
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: 1 });

    render(<Inspector inspectorStore={inspectorStore} />);
    fireEvent.click(screen.getByText('Action'));
    fireEvent.click(screen.getByText('Raw'));

    expect(screen.getByText((content) => content.includes('"type": "increment"'))).toBeInTheDocument();
  });

  it('shows the Diff tab in Raw view as JSON text', () => {
    const inspectorStore = createInspectorStore();
    const handle = inspectorStore.registerConnection('a', { count: 0 }, reducerStep);
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: 1 });

    render(<Inspector inspectorStore={inspectorStore} />);
    fireEvent.click(screen.getByText('Diff'));
    fireEvent.click(screen.getByText('Raw'));

    expect(screen.getByText((content) => content.includes('"key": "count"'))).toBeInTheDocument();
  });

  it('switches to the Diff tab and shows the change from the previous state', () => {
    const inspectorStore = createInspectorStore();
    const handle = inspectorStore.registerConnection('a', { count: 0 }, reducerStep);
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: 1 });

    render(<Inspector inspectorStore={inspectorStore} />);
    fireEvent.click(screen.getByText('Diff'));

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('switches to the Test tab, hiding the Tree/Raw toggle and showing a generated snippet', () => {
    const inspectorStore = createInspectorStore();
    const handle = inspectorStore.registerConnection('a', { count: 0 }, reducerStep);
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: 1 });

    render(<Inspector inspectorStore={inspectorStore} />);
    fireEvent.click(screen.getByText('Test'));

    expect(screen.queryByText('Tree')).not.toBeInTheDocument();
    expect(screen.getByText(/expect\(nextState\)\.toEqual/)).toBeInTheDocument();
  });

  it('clicking an action in the list jumps to that point in history', () => {
    const inspectorStore = createInspectorStore();
    const handle = inspectorStore.registerConnection('a', { count: 0 }, reducerStep);
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: 1 });
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: 2 });

    render(<Inspector inspectorStore={inspectorStore} />);
    expect(screen.getByText('2')).toBeInTheDocument();

    fireEvent.click(screen.getByText('@@INIT'));
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('toggling an action checkbox in the list skips it during replay', () => {
    const inspectorStore = createInspectorStore();
    const handle = inspectorStore.registerConnection('a', { count: 0 }, reducerStep);
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: 1 });

    render(<Inspector inspectorStore={inspectorStore} />);
    fireEvent.click(screen.getByLabelText('Include increment'));

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('clicking Tree after switching to Raw view switches back to the tree', () => {
    const inspectorStore = createInspectorStore();
    const handle = inspectorStore.registerConnection('a', { count: 0 }, reducerStep);
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: 1 });

    render(<Inspector inspectorStore={inspectorStore} />);
    fireEvent.click(screen.getByText('Raw'));
    fireEvent.click(screen.getByText('Tree'));

    expect(screen.getByText('count:')).toBeInTheDocument();
  });

  it('shows an error banner when the viewed state failed to compute', () => {
    const inspectorStore = createInspectorStore();
    const handle = inspectorStore.registerConnection('a', { count: 0 }, reducerStep);
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'boom' }, timestamp: 1 });

    render(<Inspector inspectorStore={inspectorStore} />);

    expect(screen.getByText(/Reducer threw while computing this state/)).toBeInTheDocument();
  });
});
