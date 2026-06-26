import { fireEvent, render, screen } from '@testing-library/react';
import { createDockStore } from '@headlesskit/state-management-devtools';
import { describe, expect, it } from 'vitest';
import { DockMonitor } from './dock-monitor.js';

describe('DockMonitor', () => {
  it('renders a toggle button when closed', () => {
    const dockStore = createDockStore({ isOpen: false });
    render(
      <DockMonitor dockStore={dockStore}>
        <p>panel content</p>
      </DockMonitor>,
    );

    expect(screen.getByRole('button', { name: 'Devtools' })).toBeInTheDocument();
    expect(screen.queryByText('panel content')).not.toBeInTheDocument();
  });

  it('opens the panel when the toggle button is clicked', () => {
    const dockStore = createDockStore({ isOpen: false });
    render(
      <DockMonitor dockStore={dockStore}>
        <p>panel content</p>
      </DockMonitor>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Devtools' }));
    expect(screen.getByText('panel content')).toBeInTheDocument();
  });

  it('renders the panel and children when open', () => {
    const dockStore = createDockStore({ isOpen: true });
    render(
      <DockMonitor dockStore={dockStore}>
        <p>panel content</p>
      </DockMonitor>,
    );

    expect(screen.getByText('panel content')).toBeInTheDocument();
  });

  it('closes the panel via the close button', () => {
    const dockStore = createDockStore({ isOpen: true });
    render(
      <DockMonitor dockStore={dockStore}>
        <p>panel content</p>
      </DockMonitor>,
    );

    fireEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(screen.queryByText('panel content')).not.toBeInTheDocument();
  });

  it('switches position via the position buttons', () => {
    const dockStore = createDockStore({ isOpen: true, position: 'bottom' });
    render(
      <DockMonitor dockStore={dockStore}>
        <p>panel content</p>
      </DockMonitor>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'right' }));
    expect(dockStore.getSnapshot().position).toBe('right');
  });
});
