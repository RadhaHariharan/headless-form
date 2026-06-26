import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { JsonTree } from './json-tree.js';

describe('JsonTree', () => {
  it('renders a primitive value with its label', () => {
    render(<JsonTree value={42} label="count" />);
    expect(screen.getByText('count:')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders a string value with quotes', () => {
    render(<JsonTree value="hello" />);
    expect(screen.getByText('"hello"')).toBeInTheDocument();
  });

  it('renders undefined and null as literals', () => {
    render(<JsonTree value={{ a: undefined, b: null }} />);
    expect(screen.getByText('undefined')).toBeInTheDocument();
    expect(screen.getByText('null')).toBeInTheDocument();
  });

  it('renders an object as an expanded, collapsible summary by default', () => {
    render(<JsonTree value={{ a: 1, b: 2 }} />);
    expect(screen.getByText('Object(2)')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('collapses and expands nested values on click', () => {
    render(<JsonTree value={{ nested: { a: 1, b: 2 } }} />);
    expect(screen.queryByText('1')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Object(2)'));
    expect(screen.getByText('1')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Object(2)'));
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('renders an array as Array(n) and indexes its children', () => {
    render(<JsonTree value={['x', 'y']} />);
    expect(screen.getByText('Array(2)')).toBeInTheDocument();
    expect(screen.getByText('0:')).toBeInTheDocument();
    expect(screen.getByText('"x"')).toBeInTheDocument();
  });

  it('renders an unrecognized primitive type (e.g. bigint) via String()', () => {
    render(<JsonTree value={10n} />);
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('starts collapsed when defaultExpanded is false', () => {
    render(<JsonTree value={{ a: 1 }} defaultExpanded={false} />);
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });
});
