import { marked } from 'marked';

/**
 * Docs viewer for `@headless-form`.
 *
 * The 16 MDX files live at the monorepo root in `/docs`. They are plain Markdown
 * (no JSX), so we import each as a raw string via Vite's `?raw` glob import and
 * render them with `marked`. A sidebar lists every doc; navigation is hash-based
 * so deep links (e.g. `#08-form-validation`) work and survive a refresh.
 */

// Eagerly import every doc as a raw string. Keys are module paths.
const modules = import.meta.glob('../../../docs/*.mdx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

interface Doc {
  /** Slug used in the URL hash and as the element id, e.g. `08-form-validation`. */
  slug: string;
  /** Display title, taken from the first `# ` heading (falls back to the slug). */
  title: string;
  /** Raw Markdown source. */
  source: string;
}

/** Pull the first level-1 heading out of a Markdown string. */
function extractTitle(markdown: string, fallback: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1] ? match[1].trim() : fallback;
}

// Build a list of docs sorted by filename (the numeric prefix gives reading order).
const docs: Doc[] = Object.entries(modules)
  .map(([path, source]) => {
    const file = path.split('/').pop() ?? path; // e.g. "08-form-validation.mdx"
    const slug = file.replace(/\.mdx$/, '');
    return { slug, title: extractTitle(source, slug), source };
  })
  .sort((a, b) => a.slug.localeCompare(b.slug));

const navEl = document.querySelector<HTMLElement>('#nav')!;
const contentEl = document.querySelector<HTMLElement>('#content')!;
const mainEl = document.querySelector<HTMLElement>('main')!;

// ── Sidebar ──────────────────────────────────────────────────────────────────

function buildNav(): void {
  navEl.innerHTML = docs
    .map((doc) => {
      const num = doc.slug.split('-')[0] ?? '';
      return `<a href="#${doc.slug}" data-slug="${doc.slug}">` +
        `<span class="num">${num}</span>${doc.title}</a>`;
    })
    .join('');
}

function setActive(slug: string): void {
  navEl.querySelectorAll('a').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('data-slug') === slug);
  });
}

// ── Content ──────────────────────────────────────────────────────────────────

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

// ── Routing ──────────────────────────────────────────────────────────────────

function currentSlug(): string {
  const hash = location.hash.replace(/^#/, '');
  return docs.some((d) => d.slug === hash) ? hash : docs[0]!.slug;
}

window.addEventListener('hashchange', () => renderDoc(currentSlug()));

buildNav();
renderDoc(currentSlug());
