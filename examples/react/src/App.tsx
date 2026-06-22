import React, { useRef, useState } from 'react';
import { ControlledForm } from './examples/ControlledForm.js';
import { UncontrolledForm } from './examples/UncontrolledForm.js';
import { ListForm } from './examples/ListForm.js';
import { AsyncValidationForm } from './examples/AsyncValidationForm.js';
import { NestedForm } from './examples/NestedForm.js';

const TABS = [
  { id: 'controlled', label: 'Controlled' },
  { id: 'uncontrolled', label: 'Uncontrolled (0 re-renders)' },
  { id: 'list', label: 'List Fields' },
  { id: 'async', label: 'Async Validation' },
  { id: 'nested', label: 'Nested Values' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function App() {
  const [tab, setTab] = useState<TabId>('controlled');

  return (
    <div>
      <h1>
        @headless-form/react
        <span className="badge">React 18</span>
      </h1>

      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: tab === t.id ? '#2b6cb0' : '#e2e8f0',
              color: tab === t.id ? '#fff' : '#2d3748',
              border: 'none',
              borderRadius: '4px',
              padding: '.375rem 1rem',
              cursor: 'pointer',
              fontSize: '.875rem',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="section">
        {tab === 'controlled' && <ControlledForm />}
        {tab === 'uncontrolled' && <UncontrolledForm />}
        {tab === 'list' && <ListForm />}
        {tab === 'async' && <AsyncValidationForm />}
        {tab === 'nested' && <NestedForm />}
      </div>
    </div>
  );
}
