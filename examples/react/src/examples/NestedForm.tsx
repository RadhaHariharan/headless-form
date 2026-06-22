import React from 'react';
import { useForm } from '@headless-form/react';
import { isNotEmpty, isEmail } from '@headless-form/core';

type Address = { street: string; city: string; zip: string };
type Values = { user: { firstName: string; lastName: string; email: string }; address: Address };

export function NestedForm() {
  const form = useForm<Values, Values, string>({
    initialValues: {
      user: { firstName: '', lastName: '', email: '' },
      address: { street: '', city: '', zip: '' },
    },
    validate: {
      'user.firstName': isNotEmpty('First name required'),
      'user.lastName': isNotEmpty('Last name required'),
      'user.email': isEmail('Valid email required'),
      'address.street': isNotEmpty('Street required'),
      'address.city': isNotEmpty('City required'),
    },
    validateInputOnChange: true,
  });

  const handleSubmit = form.onSubmit(
    (values) => alert(`Submitted!\n${JSON.stringify(values, null, 2)}`),
    () => {},
  );

  return (
    <div>
      <h2>Nested Dot-Notation Paths</h2>

      <form onSubmit={handleSubmit} noValidate>
        <h3 style={{ fontSize: '1rem' }}>User</h3>
        <div className="row">
          <label>
            First name
            <input {...form.getInputProps('user.firstName')} placeholder="Alice" />
            <div className="error">{form.errors['user.firstName'] ?? ''}</div>
          </label>
          <label>
            Last name
            <input {...form.getInputProps('user.lastName')} placeholder="Smith" />
            <div className="error">{form.errors['user.lastName'] ?? ''}</div>
          </label>
        </div>

        <label>
          Email
          <input {...form.getInputProps('user.email')} type="email" placeholder="alice@example.com" />
          <div className="error">{form.errors['user.email'] ?? ''}</div>
        </label>

        <h3 style={{ fontSize: '1rem' }}>Address</h3>
        <label>
          Street
          <input {...form.getInputProps('address.street')} placeholder="123 Main St" />
          <div className="error">{form.errors['address.street'] ?? ''}</div>
        </label>
        <div className="row">
          <label>
            City
            <input {...form.getInputProps('address.city')} placeholder="Springfield" />
            <div className="error">{form.errors['address.city'] ?? ''}</div>
          </label>
          <label>
            ZIP
            <input {...form.getInputProps('address.zip')} placeholder="12345" />
          </label>
        </div>

        <button type="submit" style={{ marginTop: '1rem' }}>Submit</button>
      </form>

      <pre style={{ marginTop: '1rem' }}>{JSON.stringify(form.values, null, 2)}</pre>
    </div>
  );
}
