import React from 'react';
import { useForm } from '@headless-form/react';

function checkUsernameAvailable(username: string): Promise<string | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(username === 'taken' ? 'Username is already taken' : null);
    }, 800);
  });
}

type Values = { username: string; bio: string };

export function AsyncValidationForm() {
  const form = useForm<Values, Values, string>({
    initialValues: { username: '', bio: '' },
    validate: {
      username: async (v) => {
        if (!v) return 'Required';
        return checkUsernameAvailable(v);
      },
    },
    validateInputOnChange: ['username'],
    validateDebounce: 400,
  });

  const handleSubmit = form.onSubmit(
    (values) => alert(`Submitted!\n${JSON.stringify(values, null, 2)}`),
    () => {},
  );

  return (
    <div>
      <h2>Async Validation</h2>
      <p style={{ fontSize: '.875rem', color: '#718096' }}>
        Type <strong>"taken"</strong> to trigger an async error (debounced 400ms). Try any other
        username to succeed.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <label>
          Username
          <div style={{ position: 'relative' }}>
            <input
              {...form.getInputProps('username')}
              placeholder='try "taken" or "alice"'
              style={{ paddingRight: '2rem' }}
            />
            {form.validating && (
              <span
                style={{
                  position: 'absolute',
                  right: '.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '.75rem',
                  color: '#718096',
                }}
              >
                ⏳
              </span>
            )}
          </div>
          <div className="error">{form.errors.username ?? ''}</div>
        </label>

        <label>
          Bio
          <input {...form.getInputProps('bio')} placeholder="A short bio…" />
        </label>

        <button type="submit" disabled={form.submitting || form.validating} style={{ marginTop: '.75rem' }}>
          {form.submitting ? 'Submitting…' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
