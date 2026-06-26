import { fireEvent, render, screen } from '@testing-library/react';
import { createDockStore, createInspectorStore } from '@headlesskit/state-management-devtools';
import { describe, expect, it } from 'vitest';
import { DevtoolsPanel } from './devtools-panel.js';

const reducerStep = (state: unknown, entry: { action: unknown }): unknown => {
  const count = (state as { count: number }).count;
  const a = entry.action as { type: string };
  return a.type === 'increment' ? { count: count + 1 } : state;
};

describe('DevtoolsPanel', () => {
  it('renders the dock toggle, then the inspector once opened', () => {
    const inspectorStore = createInspectorStore();
    const dockStore = createDockStore({ isOpen: false });
    const handle = inspectorStore.registerConnection('a', { count: 0 }, reducerStep);
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: Date.now() });

    render(<DevtoolsPanel inspectorStore={inspectorStore} dockStore={dockStore} />);
    expect(screen.getByRole('button', { name: 'Devtools' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Devtools' }));
    expect(screen.getByText('increment')).toBeInTheDocument();
  });
});
