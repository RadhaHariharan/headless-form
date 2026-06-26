import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createInspectorStore } from '@headlesskit/state-management-devtools';
import { describe, expect, it, vi } from 'vitest';
import { InspectorToolbar } from './inspector-toolbar.js';

const reducerStep = (state: unknown, entry: { action: unknown }): unknown => {
  const count = (state as { count: number }).count;
  const a = entry.action as { type: string };
  return a.type === 'increment' ? { count: count + 1 } : state;
};

function setup(): { inspectorStore: ReturnType<typeof createInspectorStore>; name: string } {
  const inspectorStore = createInspectorStore();
  const handle = inspectorStore.registerConnection('a', { count: 0 }, reducerStep);
  handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: 1 });
  return { inspectorStore, name: 'a' };
}

describe('InspectorToolbar', () => {
  it('renders nothing connection-picker-wise when there is only one connection', () => {
    const { inspectorStore } = setup();
    render(
      <InspectorToolbar
        inspectorStore={inspectorStore}
        connectionNames={['a']}
        activeName="a"
        onSelectConnection={vi.fn()}
        liftedState={inspectorStore.getSnapshot().connections.a}
      />,
    );
    expect(screen.queryByLabelText('Connection')).not.toBeInTheDocument();
  });

  it('shows a connection picker and calls onSelectConnection when there are multiple connections', () => {
    const { inspectorStore } = setup();
    inspectorStore.registerConnection('b', { count: 0 }, reducerStep);
    const onSelectConnection = vi.fn();

    render(
      <InspectorToolbar
        inspectorStore={inspectorStore}
        connectionNames={['a', 'b']}
        activeName="a"
        onSelectConnection={onSelectConnection}
        liftedState={inspectorStore.getSnapshot().connections.a}
      />,
    );

    fireEvent.change(screen.getByLabelText('Connection'), { target: { value: 'b' } });
    expect(onSelectConnection).toHaveBeenCalledWith('b');
  });

  it('Pause toggles isPaused, and the button label flips accordingly', () => {
    const { inspectorStore } = setup();
    const { rerender } = render(
      <InspectorToolbar
        inspectorStore={inspectorStore}
        connectionNames={['a']}
        activeName="a"
        onSelectConnection={vi.fn()}
        liftedState={inspectorStore.getSnapshot().connections.a}
      />,
    );

    fireEvent.click(screen.getByText('⏸ Pause'));
    expect(inspectorStore.getSnapshot().connections.a?.isPaused).toBe(true);

    rerender(
      <InspectorToolbar
        inspectorStore={inspectorStore}
        connectionNames={['a']}
        activeName="a"
        onSelectConnection={vi.fn()}
        liftedState={inspectorStore.getSnapshot().connections.a}
      />,
    );
    expect(screen.getByText('▶ Record')).toBeInTheDocument();
  });

  it('Lock toggles isLocked', () => {
    const { inspectorStore } = setup();
    render(
      <InspectorToolbar
        inspectorStore={inspectorStore}
        connectionNames={['a']}
        activeName="a"
        onSelectConnection={vi.fn()}
        liftedState={inspectorStore.getSnapshot().connections.a}
      />,
    );

    fireEvent.click(screen.getByText('🔓 Lock'));
    expect(inspectorStore.getSnapshot().connections.a?.isLocked).toBe(true);
  });

  it('Reset and Commit call through to the inspector store', () => {
    const { inspectorStore } = setup();
    render(
      <InspectorToolbar
        inspectorStore={inspectorStore}
        connectionNames={['a']}
        activeName="a"
        onSelectConnection={vi.fn()}
        liftedState={inspectorStore.getSnapshot().connections.a}
      />,
    );

    fireEvent.click(screen.getByText('Commit'));
    expect(inspectorStore.getSnapshot().connections.a?.committedState).toEqual({ count: 1 });

    fireEvent.click(screen.getByText('Reset'));
    expect(inspectorStore.getSnapshot().connections.a?.committedState).toEqual({ count: 0 });
  });

  it('Revert undoes the most recently dispatched action', () => {
    const inspectorStore = createInspectorStore();
    const handle = inspectorStore.registerConnection('a', { count: 0 }, reducerStep);
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: 1 });
    handle.dispatch({ type: 'PERFORM_ACTION', action: { type: 'increment' }, timestamp: 2 });

    render(
      <InspectorToolbar
        inspectorStore={inspectorStore}
        connectionNames={['a']}
        activeName="a"
        onSelectConnection={vi.fn()}
        liftedState={inspectorStore.getSnapshot().connections.a}
      />,
    );

    fireEvent.click(screen.getByText('Revert'));
    expect(inspectorStore.getSnapshot().connections.a?.stagedActionIds).toHaveLength(1);
  });

  it('Sweep removes every skipped action', () => {
    const { inspectorStore } = setup();
    const firstId = inspectorStore.getSnapshot().connections.a?.stagedActionIds[0] as number;
    inspectorStore.toggleAction('a', firstId);

    render(
      <InspectorToolbar
        inspectorStore={inspectorStore}
        connectionNames={['a']}
        activeName="a"
        onSelectConnection={vi.fn()}
        liftedState={inspectorStore.getSnapshot().connections.a}
      />,
    );

    fireEvent.click(screen.getByText('Sweep'));
    expect(inspectorStore.getSnapshot().connections.a?.stagedActionIds).toHaveLength(0);
  });

  it('Clear removes the connection', () => {
    const { inspectorStore } = setup();
    render(
      <InspectorToolbar
        inspectorStore={inspectorStore}
        connectionNames={['a']}
        activeName="a"
        onSelectConnection={vi.fn()}
        liftedState={inspectorStore.getSnapshot().connections.a}
      />,
    );

    fireEvent.click(screen.getByText('Clear'));
    expect(inspectorStore.getSnapshot().connections.a).toBeUndefined();
  });

  it('Export downloads the active connection\'s history', () => {
    const { inspectorStore } = setup();
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const element = originalCreateElement(tag);
      if (tag === 'a') element.click = clickSpy;
      return element;
    });
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });

    render(
      <InspectorToolbar
        inspectorStore={inspectorStore}
        connectionNames={['a']}
        activeName="a"
        onSelectConnection={vi.fn()}
        liftedState={inspectorStore.getSnapshot().connections.a}
      />,
    );

    fireEvent.click(screen.getByText('Export'));
    expect(clickSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('clicking the Import button opens the hidden file picker', () => {
    const { inspectorStore } = setup();
    render(
      <InspectorToolbar
        inspectorStore={inspectorStore}
        connectionNames={['a']}
        activeName="a"
        onSelectConnection={vi.fn()}
        liftedState={inspectorStore.getSnapshot().connections.a}
      />,
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => undefined);
    fireEvent.click(screen.getByText('Import'));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('Import reads a chosen valid file and applies it via importState', async () => {
    const { inspectorStore } = setup();
    render(
      <InspectorToolbar
        inspectorStore={inspectorStore}
        connectionNames={['a']}
        activeName="a"
        onSelectConnection={vi.fn()}
        liftedState={inspectorStore.getSnapshot().connections.a}
      />,
    );

    const exported = JSON.stringify(inspectorStore.getSnapshot().connections.a);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const goodFile = new File([exported], 'export.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [goodFile] } });

    await waitFor(() => {
      expect(inspectorStore.getSnapshot().connections.a?.committedState).toEqual({ count: 0 });
    });
  });

  it('Import reads a chosen file and calls importState, surfacing an error for invalid JSON', async () => {
    const { inspectorStore } = setup();
    render(
      <InspectorToolbar
        inspectorStore={inspectorStore}
        connectionNames={['a']}
        activeName="a"
        onSelectConnection={vi.fn()}
        liftedState={inspectorStore.getSnapshot().connections.a}
      />,
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const badFile = new File(['not json'], 'bad.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [badFile] } });

    await waitFor(() => {
      expect(screen.getByText(/is not a valid exported history file/)).toBeInTheDocument();
    });
  });

  it('Print calls window.print', () => {
    const { inspectorStore } = setup();
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    render(
      <InspectorToolbar
        inspectorStore={inspectorStore}
        connectionNames={['a']}
        activeName="a"
        onSelectConnection={vi.fn()}
        liftedState={inspectorStore.getSnapshot().connections.a}
      />,
    );

    fireEvent.click(screen.getByText('Print'));
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it('disables connection-dependent buttons when there is no active connection', () => {
    const { inspectorStore } = setup();
    render(
      <InspectorToolbar
        inspectorStore={inspectorStore}
        connectionNames={[]}
        activeName={undefined}
        onSelectConnection={vi.fn()}
        liftedState={undefined}
      />,
    );

    expect(screen.getByText('Reset')).toBeDisabled();
    expect(screen.getByText('Export')).toBeDisabled();
  });
});
