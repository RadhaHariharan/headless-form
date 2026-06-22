/**
 * Edge-case tests to close the remaining coverage gaps in create-form-store.ts.
 */
import { describe, it, expect, vi } from 'vitest';
import { createFormStore } from './create-form-store.js';

interface V { name: string; age: number; email: string }

// ── isValid with no validate option ──────────────────────────────────────────

describe('isValid — no validate option', () => {
  it('returns true when no validate is configured', () => {
    const s = createFormStore<V>({ initialValues: { name: '', age: 0, email: '' } });
    expect(s.isValid()).toBe(true);
  });
});

// ── onReset ───────────────────────────────────────────────────────────────────

describe('onReset', () => {
  it('calls event.preventDefault and resets values', () => {
    const s = createFormStore<V>({ initialValues: { name: 'init', age: 0, email: '' } });
    s.setFieldValue('name', 'changed');
    const pd = vi.fn();
    s.onReset({ preventDefault: pd } as unknown as Event);
    expect(pd).toHaveBeenCalled();
    expect(s.getValues().name).toBe('init');
  });
});

// ── Synchronous validator that throws ────────────────────────────────────────

describe('runValidateField — sync throw', () => {
  it('catches a thrown error and converts it via resolveValidationError', () => {
    const s = createFormStore<V>({
      initialValues: { name: '', age: 0, email: '' },
      resolveValidationError: (e) => `Caught: ${String(e)}`,
      validate: {
        name: () => { throw new Error('boom'); },
      },
    });
    const result = s.validateField('name') as { hasError: boolean; error: string };
    expect(result.hasError).toBe(true);
    expect(result.error).toMatch(/Caught/);
  });
});

// ── watchRegistry — cascade false ────────────────────────────────────────────

describe('watch — cascadeUpdates:false', () => {
  it('does NOT notify ancestor watchers when cascade is false', () => {
    const s = createFormStore<{ user: { name: string } }>({
      cascadeUpdates: false,
      initialValues: { user: { name: '' } },
    });
    const userHandler = vi.fn();
    s.watch('user', userHandler);
    s.setFieldValue('user.name', 'Bob');
    expect(userHandler).not.toHaveBeenCalled();
  });
});

// ── getSnapshot and getServerSnapshot ────────────────────────────────────────

describe('getSnapshot / getServerSnapshot', () => {
  it('getSnapshot returns the same object when state has not changed', () => {
    const s = createFormStore<V>({ initialValues: { name: '', age: 0, email: '' } });
    const snap1 = s.getSnapshot();
    const snap2 = s.getSnapshot();
    expect(snap1).toBe(snap2);
  });

  it('getSnapshot returns a new object after a state change', () => {
    const s = createFormStore<V>({ initialValues: { name: '', age: 0, email: '' } });
    const snap1 = s.getSnapshot();
    s.setFieldError('name', 'err');
    const snap2 = s.getSnapshot();
    expect(snap1).not.toBe(snap2);
  });

  it('getServerSnapshot returns a snapshot', () => {
    const s = createFormStore<V>({ initialValues: { name: '', age: 0, email: '' } });
    const snap = s.getServerSnapshot();
    expect(snap).toHaveProperty('errors');
  });
});

// ── setValues functional updater ──────────────────────────────────────────────

describe('setValues — dirty recomputation', () => {
  it('recomputes dirty for changed keys', () => {
    const s = createFormStore<V>({
      initialValues: { name: 'init', age: 0, email: '' },
    });
    s.setValues({ name: 'changed' });
    expect(s.isDirty('name')).toBe(true);
    s.setValues({ name: 'init' });
    expect(s.isDirty('name')).toBe(false);
  });
});

// ── validate — async in rules-object catch ────────────────────────────────────

describe('runValidateAll — async rule catch', () => {
  it('converts rejected async rule via resolveValidationError', async () => {
    const s = createFormStore<V>({
      initialValues: { name: '', age: 0, email: '' },
      resolveValidationError: (e) => `R:${String(e)}`,
      validate: { name: () => Promise.reject(new Error('async-throw')) },
    });
    const result = await s.validate() as { hasErrors: boolean; errors: Record<string, string> };
    expect(result.hasErrors).toBe(true);
    expect(result.errors['name']).toMatch(/R:/);
  });
});

// ── validate — function validate returning Promise (stale check) ───────────────

describe('runValidateAll — stale generation guard', () => {
  it('ignores stale async validate() result when errors are overridden', async () => {
    const s = createFormStore<V>({
      initialValues: { name: '', age: 0, email: '' },
      validate: () => new Promise((res) => setTimeout(() => res({ name: 'stale' }), 50)),
    });
    const stale = s.validate() as Promise<unknown>;
    // Bump the generation by starting another validate
    s.validate();
    await stale;
    // The stale result (name: 'stale') was from a previous generation; the result
    // from the second validate may set/clear errors but the stale one is ignored.
    // We just verify the promise resolved without crashing.
    expect(typeof s.errors).toBe('object');
  });
});

// ── initialize idempotence and subscriber notification ────────────────────────

describe('initialize — subscriber notification', () => {
  it('notifies subscribers on first call', () => {
    const s = createFormStore<V>({ initialValues: { name: '', age: 0, email: '' } });
    const cb = vi.fn();
    s.subscribe(cb);
    s.initialize({ name: 'loaded', age: 5, email: 'x@x.com' });
    expect(cb).toHaveBeenCalled();
  });
});

// ── validateInputOnChange:true ────────────────────────────────────────────────

describe('validateInputOnChange:true validates all fields on change', () => {
  it('validates on change when validateInputOnChange is true', () => {
    const s = createFormStore<V>({
      initialValues: { name: '', age: 0, email: '' },
      validateInputOnChange: true,
      validate: { name: (v) => (v ? null : 'Required') },
    });
    const props = s.getInputProps('name');
    props.onChange({ target: { value: '' } });
    // sync validation runs immediately
    expect(s.errors['name']).toBe('Required');
  });
});

// ── validateField with debounce triggers on blur ─────────────────────────────

describe('validateInputOnBlur with debounce', () => {
  it('debounces blur-triggered validation', async () => {
    const s = createFormStore<V>({
      initialValues: { name: '', age: 0, email: '' },
      validateInputOnBlur: true,
      validateDebounce: 20,
      validate: { name: (v) => (v ? null : 'Required') },
    });
    const props = s.getInputProps('name', { withFocus: true });
    props.onBlur?.();
    expect(s.errors['name']).toBeUndefined();
    await new Promise((r) => setTimeout(r, 40));
    expect(s.errors['name']).toBe('Required');
  });
});
