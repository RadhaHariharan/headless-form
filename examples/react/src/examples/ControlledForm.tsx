import React, { useRef } from 'react';
import { useForm } from '@headless-form/react';
import { isEmail, isNotEmpty, hasLength } from '@headless-form/core';

type Values = {
  name: string;
  email: string;
  password: string;
  age: string;
  role: string;
  agree: boolean;
};

export function ControlledForm() {
  const renderCount = useRef(0);
  renderCount.current += 1;

  const form = useForm<Values, Values, string | null>({
    initialValues: {
      name: '',
      email: '',
      password: '',
      age: '',
      role: 'user',
      agree: false,
    },
    validate: {
      name: isNotEmpty('Name is required'),
      email: isEmail('Valid email required'),
      password: hasLength({ min: 8 }, 'At least 8 characters'),
      agree: (v) => (!v ? 'You must agree' : null),
    },
    validateInputOnChange: true,
  });

  const handleSubmit = form.onSubmit(
    (values) => alert(`Valid!\n${JSON.stringify(values, null, 2)}`),
    () => { },
  );

  return (
    <div>
      <h2>
        Controlled Mode
        <span className="badge">renders: {renderCount.current}</span>
      </h2>

      <form onSubmit={handleSubmit} noValidate>
        <label>
          Name
          <input {...form.getInputProps('name')} placeholder="Alice" />
          <div className="error">{form.errors.name ?? ''}</div>
        </label>

        <label>
          Email
          <input {...form.getInputProps('email')} type="email" placeholder="alice@example.com" />
          <div className="error">{form.errors.email ?? ''}</div>
        </label>

        <label>
          Password
          <input {...form.getInputProps('password')} type="password" placeholder="min 8 chars" />
          <div className="error">{form.errors.password ?? ''}</div>
        </label>

        <label>
          Age
          <input {...form.getInputProps('age')} type="number" placeholder="18" />
        </label>

        <label>
          Role
          <select {...form.getInputProps('role')}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
          </select>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.5rem' }}>
          <input {...form.getInputProps('agree', { type: 'checkbox' })} />
          I agree to the terms
        </label>
        <div className="error">{form.errors.agree ?? ''}</div>

        <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem' }}>
          <button type="submit" disabled={form.submitting}>
            {form.submitting ? 'Submitting…' : 'Submit'}
          </button>
          <button type="button" onClick={() => form.reset()} style={{ background: '#718096' }}>
            Reset
          </button>
        </div>
      </form>

      <pre>{JSON.stringify({ values: form.values, errors: form.errors, dirty: form.isDirty() }, null, 2)}</pre>
    </div>
  );
}
