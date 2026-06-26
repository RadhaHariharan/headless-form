import { fireEvent, render, screen } from '@testing-library/react';
import { createInspectorStore } from '@headlesskit/state-management-devtools';
import { describe, expect, it, vi } from 'vitest';
import { ActionList } from './action-list.js';

const reducerStep = (state: unknown, entry: { action: unknown }): unknown => {
  const count = (state as { count: number }).count;
  const a = entry.action as { type: string };
  return a.type === 'increment' ? { count: count + 1 } : state;
};

function setupTwoActions(): ReturnType<ReturnType<typeof createInspectorStore>['registerConnection']> {
  const inspectorStore = createInspectorStore();
  const handle = inspectorStore.registerConnection('a', { count: 0 }, reducerStep);
  handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: 1 });
  handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'boom' }, timestamp: 2 });
  return handle;
}

describe('ActionList', () => {
  it('renders the @@INIT baseline row plus one row per staged action', () => {
    const handle = setupTwoActions();
    render(
      <ActionList liftedState={handle.getLiftedState()} onSelectIndex={vi.fn()} onToggleAction={vi.fn()} />,
    );

    expect(screen.getByText('@@INIT')).toBeInTheDocument();
    expect(screen.getByText('increment')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('clicking a row calls onSelectIndex with that row\'s index', () => {
    const handle = setupTwoActions();
    const onSelectIndex = vi.fn();
    render(
      <ActionList liftedState={handle.getLiftedState()} onSelectIndex={onSelectIndex} onToggleAction={vi.fn()} />,
    );

    fireEvent.click(screen.getByText('@@INIT'));
    expect(onSelectIndex).toHaveBeenCalledWith(-1);

    fireEvent.click(screen.getByText('increment'));
    expect(onSelectIndex).toHaveBeenCalledWith(0);
  });

  it('toggling a checkbox calls onToggleAction with that action\'s id, without selecting the row', () => {
    const handle = setupTwoActions();
    const onSelectIndex = vi.fn();
    const onToggleAction = vi.fn();
    render(
      <ActionList liftedState={handle.getLiftedState()} onSelectIndex={onSelectIndex} onToggleAction={onToggleAction} />,
    );

    const firstId = handle.getLiftedState().stagedActionIds[0] as number;
    fireEvent.click(screen.getByLabelText('Include increment'));

    expect(onToggleAction).toHaveBeenCalledWith(firstId);
    expect(onSelectIndex).not.toHaveBeenCalled();
  });

  it('filters rows by label substring, case-insensitively', () => {
    const handle = setupTwoActions();
    render(<ActionList liftedState={handle.getLiftedState()} onSelectIndex={vi.fn()} onToggleAction={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Filter actions'), { target: { value: 'BOOM' } });

    expect(screen.queryByText('increment')).not.toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('falls back to JSON.stringify for an action with no type field', () => {
    const inspectorStore = createInspectorStore();
    const handle = inspectorStore.registerConnection('a', { count: 0 }, reducerStep);
    handle.dispatch({ type: 'PERFORM_ACTION', action: 'a plain string action', timestamp: 1 });

    render(<ActionList liftedState={handle.getLiftedState()} onSelectIndex={vi.fn()} onToggleAction={vi.fn()} />);

    expect(screen.getByText('"a plain string action"')).toBeInTheDocument();
  });

  it('strikes through a skipped action and colors an erroring one', () => {
    const inspectorStore = createInspectorStore();
    const handle = inspectorStore.registerConnection('a', { count: 0 }, reducerStep);
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: 1 });
    const id = handle.getLiftedState().stagedActionIds[0] as number;
    inspectorStore.toggleAction('a', id);

    render(<ActionList liftedState={handle.getLiftedState()} onSelectIndex={vi.fn()} onToggleAction={vi.fn()} />);

    const row = screen.getByText('increment');
    expect(row).toHaveStyle({ textDecoration: 'line-through' });
  });
});
