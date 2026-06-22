import React, { useRef, useMemo } from 'react';
import {
  useForm,
  isEmail,
  isNotEmpty,
  matchesField,
  toValidationRule,
  createNumberValidator,
  createStringValidator,
  createDateValidator,
} from '@headless-form/react';
import type { FormRulesRecord } from '@headless-form/react';

const FIELD_COUNT = 120;
const KEYS = Array.from({ length: FIELD_COUNT }, (_, i) => `f${i}`);

const LABELS: Record<string, string> = {
  f0: 'Email',
  f1: 'Confirm email',
  f2: 'Age',
  f3: 'Username',
  f4: 'Birth date',
};
const TYPES: Record<string, string> = { f2: 'number', f4: 'date' };

/**
 * 120-field uncontrolled form. The render counter in the heading does NOT increase while you
 * type — proving that in uncontrolled mode the cost per keystroke is zero, independent of how
 * many fields the form has. Renders happen only when errors appear/clear or on submit.
 */
export function LargeForm() {
  const renderCount = useRef(0);
  renderCount.current += 1;

  // Build the rules once. A mix of built-in form rules, bridged field validators, a
  // cross-field rule, and an async check — all on one form.
  const validate = useMemo<FormRulesRecord<Record<string, string>, string>>(() => {
    const rules: FormRulesRecord<Record<string, string>, string> = {
      f0: isEmail('Enter a valid email'),
      f1: matchesField('f0', 'Emails must match'),
      f2: toValidationRule(createNumberValidator({ min: 18, max: 120, integer: true }), 'Age'),
      f3: toValidationRule(createStringValidator({ minLength: 3, allowedCharacters: 'alphanumeric' }), 'Username'),
      f4: toValidationRule(createDateValidator({ inPast: true }), 'Birth date'),
    };
    // Every 10th plain field is required, to show validators scaling across the form.
    for (let i = 5; i < FIELD_COUNT; i += 10) {
      rules[`f${i}`] = isNotEmpty(`Field ${i} is required`);
    }
    return rules;
  }, []);

  const form = useForm<Record<string, string>, Record<string, string>, string>({
    mode: 'uncontrolled',
    initialValues: useMemo(() => Object.fromEntries(KEYS.map((k) => [k, ''])), []),
    validateInputOnBlur: true,
    validate,
  });

  return (
    <div>
      <h2>
        Large Form — {FIELD_COUNT} fields
        <span className="badge uncontrolled">renders: {renderCount.current}</span>
      </h2>
      <p style={{ fontSize: '.875rem', color: '#718096' }}>
        Type in any field — the render counter stays put. The first five fields use complex
        validators (email, cross-field match, number, string, date); every 10th field is
        required. Renders happen only on blur-with-error or submit.
      </p>

      <form onSubmit={form.onSubmit((values) => alert(`Submitted ${Object.keys(values).length} fields`))} noValidate>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '.5rem .75rem' }}>
          {KEYS.map((k) => (
            <label key={k} style={{ display: 'flex', flexDirection: 'column', fontSize: '.7rem', color: '#718096' }}>
              {LABELS[k] ?? `Field ${k.slice(1)}`}
              <input
                {...form.getInputProps(k)}
                type={TYPES[k] ?? 'text'}
                style={{ padding: '.35rem .45rem', fontSize: '.85rem' }}
              />
              <span className="error" style={{ fontSize: '.7rem', minHeight: '.8rem' }}>
                {(form.errors[k] as string) ?? ''}
              </span>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem' }}>
          <button type="submit">Submit</button>
          <button type="button" onClick={() => form.reset()} style={{ background: '#718096' }}>
            Reset
          </button>
          <button type="button" onClick={() => void form.validate()} style={{ background: '#38a169' }}>
            Validate all
          </button>
        </div>
      </form>
    </div>
  );
}
