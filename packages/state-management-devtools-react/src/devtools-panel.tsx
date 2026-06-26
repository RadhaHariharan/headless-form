import type { JSX } from 'react';
import type { DockStore, InspectorStore } from '@headlesskit/state-management-devtools';
import { DockMonitor } from './dock-monitor.js';
import { Inspector } from './inspector.js';

/** Props for `DevtoolsPanel`. */
export interface DevtoolsPanelProps {
  /** The inspector store returned by `installDevtools`. */
  inspectorStore: InspectorStore;
  /** The dock store returned by `installDevtools`. */
  dockStore: DockStore;
}

/**
 * The main devtools UI — a `DockMonitor` containing an `Inspector`. Mount once, anywhere in
 * your app (typically gated behind a dev-only check), passing the stores returned by
 * `installDevtools` from `@headlesskit/state-management-devtools`.
 * @param props - The inspector and dock stores from `installDevtools`.
 * @param props.inspectorStore - The inspector store returned by `installDevtools`.
 * @param props.dockStore - The dock store returned by `installDevtools`.
 * @returns The devtools panel element.
 */
export function DevtoolsPanel({ inspectorStore, dockStore }: DevtoolsPanelProps): JSX.Element {
  return (
    <DockMonitor dockStore={dockStore}>
      <Inspector inspectorStore={inspectorStore} />
    </DockMonitor>
  );
}
