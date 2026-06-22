import React from 'react';
import { useForm } from '@headless-form/react';

type Values = { tags: string[]; items: Array<{ name: string; qty: number }> };

export function ListForm() {
  const form = useForm<Values>({
    initialValues: {
      tags: ['react', 'typescript'],
      items: [{ name: 'Widget', qty: 1 }],
    },
  });

  return (
    <div>
      <h2>List Fields</h2>

      <h3 style={{ fontSize: '1rem' }}>Tags (string array)</h3>
      {form.values.tags.map((tag, i) => (
        <div key={i} style={{ display: 'flex', gap: '.5rem', marginBottom: '.25rem' }}>
          <input
            {...form.getInputProps(`tags.${i}`)}
            style={{ flex: 1 }}
            placeholder={`Tag ${i + 1}`}
          />
          <button
            type="button"
            onClick={() => form.removeListItem('tags', i)}
            style={{ background: '#e53e3e', padding: '.5rem' }}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => form.insertListItem('tags', '')}
        style={{ background: '#38a169', marginBottom: '1rem' }}
      >
        + Add tag
      </button>

      <h3 style={{ fontSize: '1rem' }}>Items (object array)</h3>
      {form.values.items.map((item, i) => (
        <div key={i} className="row" style={{ marginBottom: '.5rem' }}>
          <input {...form.getInputProps(`items.${i}.name`)} placeholder="Name" />
          <input {...form.getInputProps(`items.${i}.qty`)} type="number" placeholder="Qty" />
          <button
            type="button"
            onClick={() => form.removeListItem('items', i)}
            style={{ background: '#e53e3e', flex: '0 0 auto', padding: '.5rem 1rem' }}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => form.insertListItem('items', { name: '', qty: 1 })}
        style={{ background: '#38a169' }}
      >
        + Add item
      </button>

      <pre style={{ marginTop: '1rem' }}>{JSON.stringify(form.values, null, 2)}</pre>
    </div>
  );
}
