import { marked } from 'marked';
import {
  createFormStore,
  isEmail,
  isNotEmpty,
  createNumberValidator,
  createDateValidator,
} from '@headless-form/core';

/**
 * Vanilla example for `@headless-form`.
 *
 * Two things in one page:
 *  1. A **Live Demo** (pinned first in the sidebar) — the original interactive form, wired
 *     straight to `createFormStore`, now also showing the field-validator toolkit
 *     (`createNumberValidator` / `createDateValidator`) bridged into the form's `validate`.
 *  2. A **docs viewer** — the MDX files at the monorepo root (`/docs/*.mdx`) rendered with
 *     `marked`. They are plain Markdown, imported as raw strings via Vite's `?raw` glob.
 *
 * Navigation is hash-based, so deep links (e.g. `#08-form-validation`) survive a refresh.
 */

// ── Docs (raw MDX) ────────────────────────────────────────────────────────────

const modules = import.meta.glob('../../../docs/*.mdx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

interface Doc {
  slug: string;
  title: string;
  source: string;
}

function extractTitle(markdown: string, fallback: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1] ? match[1].trim() : fallback;
}

const docs: Doc[] = Object.entries(modules)
  .map(([path, source]) => {
    const file = path.split('/').pop() ?? path;
    const slug = file.replace(/\.mdx$/, '');
    return { slug, title: extractTitle(source, slug), source };
  })
  .sort((a, b) => a.slug.localeCompare(b.slug));

const DEMO_SLUG = 'live-demo';

const navEl = document.querySelector<HTMLElement>('#nav')!;
const contentEl = document.querySelector<HTMLElement>('#content')!;
const mainEl = document.querySelector<HTMLElement>('main')!;

// ── Sidebar ──────────────────────────────────────────────────────────────────

function buildNav(): void {
  const demoLink =
    `<a href="#${DEMO_SLUG}" data-slug="${DEMO_SLUG}" class="demo-link">` +
    `<span class="num">▶</span>Live Demo</a>`;
  const docLinks = docs
    .map((doc) => {
      const num = doc.slug.split('-')[0] ?? '';
      return `<a href="#${doc.slug}" data-slug="${doc.slug}">` +
        `<span class="num">${num}</span>${doc.title}</a>`;
    })
    .join('');
  navEl.innerHTML = demoLink + docLinks;
}

function setActive(slug: string): void {
  navEl.querySelectorAll('a').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('data-slug') === slug);
  });
}

// ── Docs rendering ───────────────────────────────────────────────────────────

function renderDoc(slug: string): void {
  const index = Math.max(0, docs.findIndex((d) => d.slug === slug));
  const doc = docs[index]!;
  const html = marked.parse(doc.source) as string;

  const prev = index > 0 ? docs[index - 1]! : null;
  const next = index < docs.length - 1 ? docs[index + 1]! : null;
  const pager =
    `<div class="doc-nav">` +
    (prev ? `<a class="prev" href="#${prev.slug}">← ${prev.title}</a>` : '') +
    (next ? `<a class="next" href="#${next.slug}">${next.title} →</a>` : '') +
    `</div>`;

  contentEl.innerHTML = html + pager;
  setActive(doc.slug);
  mainEl.scrollTo({ top: 0 });
}

// ── Live demo ────────────────────────────────────────────────────────────────

interface DemoValues {
  name: string;
  email: string;
  age: string;
  dob: string;
}

const DEMO_FIELDS: Array<keyof DemoValues> = ['name', 'email', 'age', 'dob'];

function renderDemo(): void {
  contentEl.innerHTML = `
    <h1>Live Demo</h1>
    <p>
      A form wired directly to <code>createFormStore</code> from
      <code>@headless-form/core</code> — no framework. The subscriber-notification counter
      below updates only when state the UI cares about changes. <strong>Age</strong> and
      <strong>Date of birth</strong> are validated with the field-validator toolkit
      (<code>createNumberValidator</code> / <code>createDateValidator</code>) bridged into the
      form's <code>validate</code> rules.
    </p>
    <form id="demo-form" class="demo-form" novalidate>
      <label for="demo-name">Name</label>
      <input id="demo-name" type="text" placeholder="Ada Lovelace" />
      <div class="demo-error" id="demo-name-error"></div>

      <label for="demo-email">Email</label>
      <input id="demo-email" type="email" placeholder="ada@example.com" />
      <div class="demo-error" id="demo-email-error"></div>

      <label for="demo-age">Age <span class="hint">(18–120, whole number)</span></label>
      <input id="demo-age" type="number" placeholder="30" />
      <div class="demo-error" id="demo-age-error"></div>

      <label for="demo-dob">Date of birth <span class="hint">(must be in the past)</span></label>
      <input id="demo-dob" type="date" />
      <div class="demo-error" id="demo-dob-error"></div>

      <div class="demo-actions">
        <button type="submit">Submit</button>
        <button type="reset" class="secondary" id="demo-reset">Reset</button>
      </div>
    </form>

    <div class="demo-stats">
      Subscriber fired: <span id="demo-render-count">0</span> time(s)
    </div>
    <pre id="demo-state"></pre>
  `;
  setActive(DEMO_SLUG);
  wireDemo();
  mainEl.scrollTo({ top: 0 });
}

function wireDemo(): void {
  const ageRule = createNumberValidator({
    min: 18,
    max: 120,
    integer: true,
    messages: { min: 'You must be at least 18', integer: 'Age must be a whole number' },
  });
  const dobRule = createDateValidator({
    inPast: true,
    messages: { inPast: 'Date of birth must be in the past' },
  });

  const form = createFormStore<DemoValues, DemoValues, string>({
    initialValues: { name: '', email: '', age: '', dob: '' },
    validateInputOnBlur: true,
    validate: {
      name: isNotEmpty('Name is required'),
      email: isEmail('Invalid email address'),
      age: (value) => ageRule(value, 'Age'),
      dob: (value) => dobRule(value, 'Date of birth'),
    },
  });

  const inputs = {} as Record<keyof DemoValues, HTMLInputElement>;
  const errors = {} as Record<keyof DemoValues, HTMLElement>;
  for (const f of DEMO_FIELDS) {
    inputs[f] = document.querySelector<HTMLInputElement>(`#demo-${f}`)!;
    errors[f] = document.querySelector<HTMLElement>(`#demo-${f}-error`)!;
  }
  const counterEl = document.querySelector<HTMLElement>('#demo-render-count')!;
  const stateEl = document.querySelector<HTMLElement>('#demo-state')!;
  const formEl = document.querySelector<HTMLFormElement>('#demo-form')!;

  let fires = 0;
  form.subscribe(() => {
    fires += 1;
    counterEl.textContent = String(fires);
    const snap = form.getSnapshot();
    const values = form.getValues();
    for (const f of DEMO_FIELDS) {
      const err = snap.errors[f] as string | undefined;
      errors[f].textContent = err ?? '';
      inputs[f].toggleAttribute('data-invalid', Boolean(err));
      // Keep the DOM in sync (e.g. after reset) without disrupting active typing.
      const v = String(values[f] ?? '');
      if (inputs[f].value !== v) inputs[f].value = v;
    }
    stateEl.textContent = JSON.stringify(values, null, 2);
  });

  for (const f of DEMO_FIELDS) {
    const props = form.getInputProps(f);
    inputs[f].addEventListener('input', (e) => props.onChange(e));
    inputs[f].addEventListener('blur', () => props.onBlur?.());
  }

  formEl.addEventListener(
    'submit',
    form.onSubmit(
      (values) => window.alert(`Submitted!\n${JSON.stringify(values, null, 2)}`),
      () => {
        /* validation errors are shown inline */
      },
    ),
  );
  document.querySelector<HTMLButtonElement>('#demo-reset')!.addEventListener('click', (e) => {
    e.preventDefault();
    form.reset();
  });

  // Initial state paint.
  stateEl.textContent = JSON.stringify(form.getValues(), null, 2);
}

// ── Routing ──────────────────────────────────────────────────────────────────

function currentSlug(): string {
  const hash = location.hash.replace(/^#/, '');
  if (hash === DEMO_SLUG) return DEMO_SLUG;
  return docs.some((d) => d.slug === hash) ? hash : DEMO_SLUG;
}

function route(): void {
  const slug = currentSlug();
  if (slug === DEMO_SLUG) renderDemo();
  else renderDoc(slug);
}

window.addEventListener('hashchange', route);

buildNav();
route();
