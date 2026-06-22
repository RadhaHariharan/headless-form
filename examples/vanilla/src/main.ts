import { marked } from 'marked';
import {
  createFormStore,
  isEmail,
  isNotEmpty,
  matchesField,
  createNumberValidator,
  createStringValidator,
  createDateValidator,
  toValidationRule,
} from '@headless-form/core';
import type { FormRulesRecord } from '@headless-form/core';

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
const LARGE_SLUG = 'large-form';

const navEl = document.querySelector<HTMLElement>('#nav')!;
const contentEl = document.querySelector<HTMLElement>('#content')!;
const mainEl = document.querySelector<HTMLElement>('main')!;

// ── Sidebar ──────────────────────────────────────────────────────────────────

function buildNav(): void {
  const demoLink =
    `<a href="#${DEMO_SLUG}" data-slug="${DEMO_SLUG}" class="demo-link">` +
    `<span class="num">▶</span>Live Demo</a>`;
  const largeLink =
    `<a href="#${LARGE_SLUG}" data-slug="${LARGE_SLUG}" class="demo-link">` +
    `<span class="num">▶</span>Large Form (120 fields)</a>`;
  const docLinks = docs
    .map((doc) => {
      const num = doc.slug.split('-')[0] ?? '';
      return `<a href="#${doc.slug}" data-slug="${doc.slug}">` +
        `<span class="num">${num}</span>${doc.title}</a>`;
    })
    .join('');
  navEl.innerHTML = demoLink + largeLink + docLinks;
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
      // Existing form-rule validators and the new field validators (bridged with
      // `toValidationRule`) live side by side in the same `validate` object.
      name: isNotEmpty('Name is required'),
      email: isEmail('Invalid email address'),
      age: toValidationRule(ageRule, 'Age'),
      dob: toValidationRule(dobRule, 'Date of birth'),
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

// ── Large form (120 fields) — re-render / notification benchmark ──────────────

const LARGE_FIELD_COUNT = 120;
/** Keys f0…f119. The first six have special roles with complex validators. */
const LARGE_KEYS = Array.from({ length: LARGE_FIELD_COUNT }, (_, i) => `f${i}`);

const LARGE_LABELS: Record<string, string> = {
  f0: 'Email',
  f1: 'Confirm email',
  f2: 'Age',
  f3: 'Username',
  f4: 'Birth date',
  f5: 'Promo code (async)',
};
const LARGE_TYPES: Record<string, string> = { f2: 'number', f4: 'date' };

function renderLargeForm(): void {
  const cells = LARGE_KEYS.map((k, i) => {
    const label = LARGE_LABELS[k] ?? `Field ${i}`;
    const type = LARGE_TYPES[k] ?? 'text';
    const special = LARGE_LABELS[k] ? ' lf-special' : '';
    return (
      `<div class="lf-cell${special}">` +
      `<label for="lf-${k}">${label}</label>` +
      `<input id="lf-${k}" data-key="${k}" type="${type}" />` +
      `<div class="lf-err" id="lf-${k}-err"></div>` +
      `</div>`
    );
  }).join('');

  contentEl.innerHTML = `
    <h1>Large Form — ${LARGE_FIELD_COUNT} fields</h1>
    <p>
      An <strong>uncontrolled</strong> form with ${LARGE_FIELD_COUNT} fields. The first six use
      complex validators (email, cross-field email match, number, string, date, and an
      <em>async</em> promo-code check). The rest are plain text fields. The counters below are
      the whole point: in uncontrolled mode, <strong>typing never notifies subscribers</strong>
      — so a UI framework bound to the store does <strong>zero re-renders per keystroke</strong>,
      no matter how many fields there are.
    </p>
    <div class="lf-stats">
      <span>Keystrokes: <b id="lf-keystrokes">0</b></span>
      <span>Store notifications: <b id="lf-notifs">0</b></span>
      <span>Validations run: <b id="lf-valruns">0</b></span>
    </div>
    <div class="lf-actions">
      <button type="button" id="lf-simulate">Simulate 500 keystrokes</button>
      <button type="button" id="lf-validate">Validate all</button>
      <button type="button" id="lf-reset" class="secondary">Reset</button>
    </div>
    <p id="lf-result" class="lf-result"></p>
    <form id="lf-form" novalidate><div class="lf-grid">${cells}</div></form>
  `;
  setActive(LARGE_SLUG);
  wireLargeForm();
  mainEl.scrollTo({ top: 0 });
}

function wireLargeForm(): void {
  let valRuns = 0;
  const ageRule = createNumberValidator({ min: 18, max: 120, integer: true });
  const userRule = createStringValidator({ minLength: 3, allowedCharacters: 'alphanumeric' });
  const dobRule = createDateValidator({ inPast: true });

  // Mix of existing form-rule validators, bridged field validators, a cross-field rule,
  // and an async rule — all on a single store.
  const validate: FormRulesRecord<Record<string, string>, string> = {
    f0: isEmail('Enter a valid email'),
    f1: matchesField('f0', 'Emails must match'),
    f2: toValidationRule(ageRule, 'Age'),
    f3: toValidationRule(userRule, 'Username'),
    f4: toValidationRule(dobRule, 'Birth date'),
    f5: async (value) => {
      valRuns += 1;
      await new Promise((r) => setTimeout(r, 120));
      return String(value ?? '').toLowerCase() === 'taken' ? 'Promo code already used' : null;
    },
  };
  // Make every 10th plain field required, to show validators scaling across the form.
  for (let i = 6; i < LARGE_FIELD_COUNT; i += 10) {
    validate[`f${i}`] = isNotEmpty(`Field ${i} is required`);
  }

  const initialValues = Object.fromEntries(LARGE_KEYS.map((k) => [k, ''])) as Record<string, string>;
  const form = createFormStore<Record<string, string>, Record<string, string>, string>({
    mode: 'uncontrolled',
    initialValues,
    validate,
    validateInputOnBlur: true,
  });

  const keystrokesEl = document.querySelector<HTMLElement>('#lf-keystrokes')!;
  const notifsEl = document.querySelector<HTMLElement>('#lf-notifs')!;
  const valRunsEl = document.querySelector<HTMLElement>('#lf-valruns')!;
  const resultEl = document.querySelector<HTMLElement>('#lf-result')!;
  const formEl = document.querySelector<HTMLFormElement>('#lf-form')!;

  let keystrokes = 0;
  let notifs = 0;
  form.subscribe(() => {
    notifs += 1;
    notifsEl.textContent = String(notifs);
    const snap = form.getSnapshot();
    // Paint errors only for fields that have one (cheap even with 120 fields).
    for (const k of LARGE_KEYS) {
      const errEl = document.querySelector<HTMLElement>(`#lf-${k}-err`);
      if (!errEl) continue;
      const err = snap.errors[k] as string | undefined;
      errEl.textContent = err ?? '';
    }
  });

  for (const k of LARGE_KEYS) {
    const input = document.querySelector<HTMLInputElement>(`#lf-${k}`)!;
    const props = form.getInputProps(k);
    input.addEventListener('input', (e) => {
      keystrokes += 1;
      keystrokesEl.textContent = String(keystrokes);
      props.onChange(e);
    });
    input.addEventListener('blur', () => props.onBlur?.());
  }

  // Programmatically type 10 chars into 50 fields = 500 input events, and report the
  // change in store notifications (should be ~0 in uncontrolled mode).
  document.querySelector<HTMLButtonElement>('#lf-simulate')!.addEventListener('click', () => {
    const before = notifs;
    for (let i = 0; i < 50; i++) {
      const input = document.querySelector<HTMLInputElement>(`#lf-f${i}`)!;
      for (let c = 0; c < 10; c++) {
        input.value += 'x';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    const delta = notifs - before;
    resultEl.textContent =
      `Typed 500 characters across 50 fields → ${delta} store notification(s). ` +
      `Uncontrolled mode means a bound framework would re-render ${delta} time(s) for all that typing.`;
  });

  document.querySelector<HTMLButtonElement>('#lf-validate')!.addEventListener('click', () => {
    valRuns += 1;
    valRunsEl.textContent = String(valRuns);
    const result = form.validate();
    Promise.resolve(result).then((r) => {
      resultEl.textContent = r.hasErrors
        ? `Validation finished: ${Object.keys(r.errors).length} field(s) have errors.`
        : 'Validation finished: all fields valid.';
    });
  });

  document.querySelector<HTMLButtonElement>('#lf-reset')!.addEventListener('click', () => {
    form.reset();
    for (const k of LARGE_KEYS) {
      document.querySelector<HTMLInputElement>(`#lf-${k}`)!.value = '';
    }
    keystrokes = 0;
    keystrokesEl.textContent = '0';
    resultEl.textContent = '';
  });

  formEl.addEventListener(
    'submit',
    form.onSubmit(
      (values) => window.alert(`Submitted ${Object.keys(values).length} fields.`),
      () => {
        /* inline errors */
      },
    ),
  );
}

// ── Routing ──────────────────────────────────────────────────────────────────

function currentSlug(): string {
  const hash = location.hash.replace(/^#/, '');
  if (hash === DEMO_SLUG || hash === LARGE_SLUG) return hash;
  return docs.some((d) => d.slug === hash) ? hash : DEMO_SLUG;
}

function route(): void {
  const slug = currentSlug();
  if (slug === DEMO_SLUG) renderDemo();
  else if (slug === LARGE_SLUG) renderLargeForm();
  else renderDoc(slug);
}

window.addEventListener('hashchange', route);

buildNav();
route();
