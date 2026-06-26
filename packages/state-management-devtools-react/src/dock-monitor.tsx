import type { JSX, ReactNode } from 'react';
import type { DockPosition, DockStore } from '@headlesskit/state-management-devtools';
import { useDockSnapshot } from './use-dock-snapshot.js';

/** Props for `DockMonitor`. */
export interface DockMonitorProps {
  /** The dock store controlling open/closed, position, and size. */
  dockStore: DockStore;
  /** The panel content, typically an `Inspector`. */
  children: ReactNode;
}

const positions = ['top', 'right', 'bottom', 'left'] as const;

const toggleButtonStyle = {
  position: 'fixed' as const,
  bottom: 8,
  right: 8,
  zIndex: 2147483647,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 11,
  padding: '4px 8px',
  borderRadius: 4,
  border: '1px solid #334155',
  background: '#0f172a',
  color: '#e2e8f0',
  cursor: 'pointer',
};

const headerStyle = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '4px 8px',
  borderBottom: '1px solid #1e293b',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 11,
  color: '#94a3b8',
  background: '#0f172a',
};

/**
 * Computes the fixed-position panel style for the given dock position and size.
 * @param position - Which edge of the viewport the panel is docked to.
 * @param size - The panel's thickness in pixels.
 * @returns A CSS style object for the panel container.
 */
function panelStyle(position: DockPosition, size: number): Record<string, string | number> {
  const base: Record<string, string | number> = {
    position: 'fixed',
    zIndex: 2147483646,
    background: '#0f172a',
    boxShadow: '0 0 0 1px #1e293b',
    display: 'flex',
    flexDirection: 'column',
  };
  if (position === 'bottom') return { ...base, left: 0, right: 0, bottom: 0, height: size };
  if (position === 'top') return { ...base, left: 0, right: 0, top: 0, height: size };
  if (position === 'left') return { ...base, top: 0, bottom: 0, left: 0, width: size };
  return { ...base, top: 0, bottom: 0, right: 0, width: size };
}

/**
 * Wraps its children in a fixed, dockable panel — a floating toggle button when closed, and a
 * panel docked to one edge of the viewport (with a position-switcher and close button) when
 * open.
 * @param props - The dock store and the panel content.
 * @param props.dockStore - The dock store controlling open/closed, position, and size.
 * @param props.children - The panel content, typically an `Inspector`.
 * @returns The dock monitor element.
 */
export function DockMonitor({ dockStore, children }: DockMonitorProps): JSX.Element {
  const snapshot = useDockSnapshot(dockStore);

  if (!snapshot.isOpen) {
    return (
      <button
        type="button"
        style={toggleButtonStyle}
        onClick={() => {
          dockStore.open();
        }}
      >
        Devtools
      </button>
    );
  }

  return (
    <div style={panelStyle(snapshot.position, snapshot.size)}>
      <div style={headerStyle}>
        <span>Devtools</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {positions.map((position) => (
            <button
              key={position}
              type="button"
              disabled={position === snapshot.position}
              onClick={() => {
                dockStore.setPosition(position);
              }}
            >
              {position}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              dockStore.close();
            }}
          >
            ✕
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>{children}</div>
    </div>
  );
}
