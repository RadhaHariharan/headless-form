import React, { useRef } from 'react';
import { useForm } from '@headless-form/react';
import { isEmail, isNotEmpty } from '@headless-form/core';

type Values = { name: string; email: string };

export function UncontrolledForm() {
  const renderCount = useRef(0);
  renderCount.current += 1;

  const form = useForm<Values, Values>({
    mode: 'uncontrolled',
    initialValues: { name: '', email: '' },
    validate: {
      name: isNotEmpty('Name is required'),
      email: isEmail('Valid email required'),
    },
  });

  const handleSubmit = form.onSubmit(
    (values) => alert(`Valid!\n${JSON.stringify(values, null, 2)}`),
    () => { },
  );

  return (
    <div>
      <h2>
        Uncontrolled Mode
        <span className="badge uncontrolled">renders: {renderCount.current}</span>
      </h2>
      <p style={{ fontSize: '.875rem', color: '#718096' }}>
        Type in the fields below — the render counter will NOT increase. Renders only happen when
        errors appear or the form is submitted.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {/* key= forces input remount when value is set programmatically */}
        <label>
          Name
          <input
            key={form.key('name')}
            {...form.getInputProps('name')}
            defaultValue=""
            placeholder="Alice"
          />
          <div className="error">{form.errors.name ?? ''}</div>
        </label>

        <label>
          Email
          <input
            key={form.key('email')}
            {...form.getInputProps('email')}
            type="email"
            defaultValue=""
            placeholder="alice@example.com"
          />
          <div className="error">{form.errors.email ?? ''}</div>
        </label>

        <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem' }}>
          <button type="submit">Submit</button>
          <button type="button" onClick={() => form.reset()} style={{ background: '#718096' }}>
            Reset
          </button>
          <button
            type="button"
            onClick={() => form.setFieldValue('name', 'Alice')}
            style={{ background: '#38a169' }}
          >
            Set name = Alice
          </button>
        </div>
      </form>
    </div>
  );
}
