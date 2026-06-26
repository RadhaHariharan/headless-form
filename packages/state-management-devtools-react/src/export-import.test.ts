import { describe, expect, it, vi } from 'vitest';
import { createInitialLiftedState } from '@headlesskit/state-management-devtools';
import { exportLiftedState, importLiftedState } from './export-import.js';

describe('exportLiftedState', () => {
  it('creates a download link named after the connection and clicks it', () => {
    const liftedState = createInitialLiftedState({ count: 0 });
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });

    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string) => {
        const element = originalCreateElement(tag);
        if (tag === 'a') element.click = clickSpy;
        return element;
      });

    exportLiftedState('my-store', liftedState);

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');

    createElementSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});

describe('importLiftedState', () => {
  it('parses a JSON file into a LiftedState', async () => {
    const liftedState = createInitialLiftedState({ count: 0 });
    const file = new File([JSON.stringify(liftedState)], 'export.json', { type: 'application/json' });

    const result = await importLiftedState(file);
    expect(result).toEqual(liftedState);
  });

  it('rejects when the file is not valid JSON', async () => {
    const file = new File(['not json'], 'bad.json', { type: 'application/json' });
    await expect(importLiftedState(file)).rejects.toThrow();
  });

  it('rejects when the FileReader itself errors', async () => {
    const file = new File(['{}'], 'export.json', { type: 'application/json' });
    const readAsTextSpy = vi.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function mock(this: FileReader) {
      this.onerror?.(new ProgressEvent('error') as never);
    });

    await expect(importLiftedState(file)).rejects.toThrow('Failed to read file');
    readAsTextSpy.mockRestore();
  });
});
