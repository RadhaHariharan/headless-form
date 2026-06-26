import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { computeDiff } from './compute-diff.js';
import { DiffTree } from './diff-tree.js';

describe('DiffTree', () => {
  it('renders added and removed fields with +/− markers', () => {
    render(<DiffTree nodes={computeDiff({ a: 1 }, { b: 2 })} />);
    expect(screen.getByText('− 1')).toBeInTheDocument();
    expect(screen.getByText('+ 2')).toBeInTheDocument();
  });

  it('renders a changed field as prev ⇒ next', () => {
    render(<DiffTree nodes={computeDiff({ count: 1 }, { count: 2 })} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows only changed fields when at least one field changed', () => {
    render(<DiffTree nodes={computeDiff({ a: 1, b: 2 }, { a: 1, b: 3 })} />);
    expect(screen.queryByText('a')).not.toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
  });

  it('falls back to showing every field when nothing changed', () => {
    render(<DiffTree nodes={computeDiff({ a: 1 }, { a: 1 })} />);
    expect(screen.getByText('a')).toBeInTheDocument();
  });

  it('falls back to String() when a value cannot be JSON.stringify-ed (e.g. a circular reference)', () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;
    render(<DiffTree nodes={[{ key: 'broken', status: 'added', nextValue: circular }]} />);

    expect(screen.getByText(`+ ${String(circular)}`)).toBeInTheDocument();
  });

  it('collapses and expands a nested changed field', () => {
    render(<DiffTree nodes={computeDiff({ nav: { index: 1 } }, { nav: { index: 0 } })} />);
    expect(screen.getByText('1')).toBeInTheDocument();

    fireEvent.click(screen.getByText('nav'));
    expect(screen.queryByText('index')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('nav'));
    expect(screen.getByText('index')).toBeInTheDocument();
  });
});
