import type { LiftedState } from '@headlesskit/state-management-devtools';

/**
 * Triggers a browser download of a connection's lifted state as a JSON file.
 * @param connectionName - The connection's name, used to name the file.
 * @param liftedState - The lifted state to export.
 */
export function exportLiftedState(connectionName: string, liftedState: LiftedState): void {
  const blob = new Blob([JSON.stringify(liftedState, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${connectionName}-devtools-export.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Reads a `File` (from a file input) as a `LiftedState`, for re-importing a previously exported
 * history.
 * @param file - The file to read.
 * @returns The parsed lifted state.
 * @throws If the file isn't valid JSON.
 */
export async function importLiftedState(file: File): Promise<LiftedState> {
  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = (): void => {
      reject(reader.error ?? new Error('Failed to read file'));
    };
    reader.readAsText(file);
  });
  return JSON.parse(text) as LiftedState;
}
