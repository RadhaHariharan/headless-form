import { describe, it, expect } from 'vitest';
import { schemaResolver } from './schema-resolver.js';
import type { StandardSchema } from './schema-resolver.js';

// ── Minimal schema stubs ──────────────────────────────────────────────────────

function makeSyncSchema<T>(
  validate: (v: unknown) => { value: T } | { issues: Array<{ message: string; path?: string[] }> },
): StandardSchema<T> {
  return {
    '~standard': {
      version: 1,
      vendor: 'test',
      validate(value: unknown) {
        return validate(value) as ReturnType<typeof validate>;
      },
    },
  };
}

function makeAsyncSchema<T>(
  validate: (v: unknown) => Promise<{ value: T } | { issues: Array<{ message: string; path?: string[] }> }>,
): StandardSchema<T> {
  return {
    '~standard': {
      version: 1,
      vendor: 'test',
      validate(value: unknown) {
        return validate(value) as Promise<{ value: T } | { issues: Array<{ message: string; path?: string[] }> }>;
      },
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('schemaResolver', () => {
  it('returns empty errors when schema passes', () => {
    const schema = makeSyncSchema((v) => ({ value: v as { email: string } }));
    const resolver = schemaResolver(schema);
    const result = resolver({ email: 'valid@test.com' });
    expect(result).toEqual({});
  });

  it('maps schema issues to form errors keyed by path', () => {
    const schema = makeSyncSchema(() => ({
      issues: [
        { message: 'Invalid email', path: ['email'] },
        { message: 'Too short', path: ['user', 'name'] },
      ],
    }));
    const resolver = schemaResolver(schema);
    const result = resolver({ email: '', user: { name: '' } });
    expect(result).toEqual({
      email: 'Invalid email',
      'user.name': 'Too short',
    });
  });

  it('returns a Promise for async schema', async () => {
    const schema = makeAsyncSchema(async () => ({ value: { email: 'ok' } }));
    const resolver = schemaResolver(schema);
    const result = resolver({ email: 'ok' });
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toEqual({});
  });

  it('async schema maps issues to errors', async () => {
    const schema = makeAsyncSchema(async () => ({
      issues: [{ message: 'Async error', path: ['field'] }],
    }));
    const resolver = schemaResolver(schema);
    const result = await (resolver({}) as Promise<Record<string, string>>);
    expect(result['field']).toBe('Async error');
  });

  it('sync:true throws when schema returns a Promise', () => {
    const schema = makeAsyncSchema(async () => ({ value: {} }));
    const resolver = schemaResolver(schema, { sync: true });
    expect(() => resolver({})).toThrow(/sync/);
  });

  it('only records first error per path (no duplicates)', () => {
    const schema = makeSyncSchema(() => ({
      issues: [
        { message: 'First', path: ['email'] },
        { message: 'Second', path: ['email'] },
      ],
    }));
    const resolver = schemaResolver(schema);
    const result = resolver({}) as Record<string, string>;
    expect(result['email']).toBe('First');
  });
});
