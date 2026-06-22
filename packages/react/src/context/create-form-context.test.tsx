import { describe, it, expect } from 'vitest';
import { renderHook, act, render, screen } from '@testing-library/react';
import React from 'react';
import { createFormContext } from './create-form-context.js';
import { useForm } from '../hooks/use-form.js';

interface TestValues {
  name: string;
  email: string;
}

describe('createFormContext', () => {
  it('provider supplies form to children via useFormContext', () => {
    const [FormProvider, useFormContext] = createFormContext<TestValues>();

    function Child() {
      const form = useFormContext();
      return React.createElement('span', { 'data-testid': 'name' }, form.getValues().name);
    }

    function Parent() {
      const form = useForm<TestValues>({ initialValues: { name: 'Jane', email: '' } });
      return React.createElement(FormProvider, { form, children: React.createElement(Child) });
    }

    render(React.createElement(Parent));
    expect(screen.getByTestId('name').textContent).toBe('Jane');
  });

  it('useFormContext outside provider throws a descriptive error', () => {
    const [, useFormContext] = createFormContext<TestValues>();

    function Orphan() {
      useFormContext();
      return null;
    }

    expect(() => render(React.createElement(Orphan))).toThrow(/FormProvider/);
  });

  it('nested providers work independently', () => {
    const [FormProvider, useFormContext] = createFormContext<TestValues>();

    function Inner() {
      const form = useFormContext();
      return React.createElement('span', { 'data-testid': 'inner' }, form.getValues().name);
    }

    function Outer() {
      const form = useFormContext();
      return React.createElement('span', { 'data-testid': 'outer' }, form.getValues().name);
    }

    function App() {
      const outerForm = useForm<TestValues>({ initialValues: { name: 'Outer', email: '' } });
      const innerForm = useForm<TestValues>({ initialValues: { name: 'Inner', email: '' } });
      return React.createElement(FormProvider, {
        form: outerForm,
        children: [
          React.createElement(Outer),
          React.createElement(FormProvider, {
            form: innerForm,
            children: React.createElement(Inner),
          }),
        ],
      });
    }

    render(React.createElement(App));
    expect(screen.getByTestId('outer').textContent).toBe('Outer');
    expect(screen.getByTestId('inner').textContent).toBe('Inner');
  });

  it('returns a pre-typed useForm hook', () => {
    const [, , useMyForm] = createFormContext<TestValues>();
    const { result } = renderHook(() => useMyForm({ initialValues: { name: 'X', email: '' } }));
    expect(result.current.getValues().name).toBe('X');
  });
});
