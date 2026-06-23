import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'

// ── Load all docs eagerly ─────────────────────────────────────────────────────
const rawDocs = import.meta.glob('../../../docs/*.mdx', { query: '?raw', import: 'default', eager: true })

// ── Parse into structured list ────────────────────────────────────────────────
const docs = Object.entries(rawDocs)
  .map(([path, content]) => {
    const filename = path.split('/').pop().replace('.mdx', '')
    const num = parseInt(filename.split('-')[0], 10)
    const title = content.match(/^# (.+)$/m)?.[1] ?? filename.replace(/^\d+-/, '').replace(/-/g, ' ')
    return { num, slug: filename, title, content }
  })
  .sort((a, b) => a.num - b.num)

// ── Sections ──────────────────────────────────────────────────────────────────
const SECTIONS = [
  { name: 'Form', range: [1, 18] },
  { name: 'State Management', range: [19, 21] },
  { name: 'TanStack Query', range: [22, 26] },
]

// ── Configure marked ──────────────────────────────────────────────────────────
marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    },
  }),
)

marked.use({
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens)
      const id = text
        .toLowerCase()
        .replace(/<[^>]+>/g, '')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
      return `<h${depth} id="${id}">${text}</h${depth}>\n`
    },
  },
})

// ── DOM refs ──────────────────────────────────────────────────────────────────
const nav        = document.getElementById('nav')
const content    = document.getElementById('content')
const toc        = document.getElementById('toc')
const tocPanel   = document.getElementById('toc-panel')
const searchEl   = document.getElementById('search')
const breadcrumb = document.getElementById('breadcrumb')
const menuBtn    = document.getElementById('menu-btn')
const sidebar    = document.getElementById('sidebar')
const overlay    = document.getElementById('overlay')

// ── Sidebar rendering ─────────────────────────────────────────────────────────
function renderNav(filter = '') {
  const q = filter.toLowerCase().trim()
  const activeSlug = location.hash.slice(1)
  let html = ''
  let anyResult = false

  for (const section of SECTIONS) {
    const sectionDocs = docs.filter(d =>
      d.num >= section.range[0] &&
      d.num <= section.range[1] &&
      (!q || d.title.toLowerCase().includes(q)),
    )
    if (sectionDocs.length === 0) continue
    anyResult = true
    html += `<div class="nav-section"><div class="nav-section-title">${section.name}</div>`
    for (const doc of sectionDocs) {
      const active = doc.slug === activeSlug ? ' active' : ''
      html += `<a href="#${doc.slug}" class="nav-item${active}">
        <span class="nav-num">${String(doc.num).padStart(2, '0')}</span>
        ${doc.title}
      </a>`
    }
    html += `</div>`
  }

  if (!anyResult) {
    html = `<div class="no-results">No results for "<strong>${filter}</strong>"</div>`
  }

  nav.innerHTML = html
}

// ── ToC building ──────────────────────────────────────────────────────────────
function buildToc(container) {
  const headings = container.querySelectorAll('h2, h3')
  if (headings.length < 2) {
    tocPanel.style.display = 'none'
    return
  }
  tocPanel.style.display = ''
  let tocHtml = ''
  for (const h of headings) {
    const cls = h.tagName === 'H2' ? 'toc-h2' : 'toc-h3'
    tocHtml += `<a href="#${h.id}" class="${cls}">${h.textContent}</a>`
  }
  toc.innerHTML = tocHtml

  // Intersection observer to highlight active section
  const links = Array.from(toc.querySelectorAll('a'))
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          links.forEach(l => l.classList.remove('active'))
          const link = links.find(l => l.getAttribute('href') === `#${entry.target.id}`)
          link?.classList.add('active')
        }
      }
    },
    { rootMargin: '0px 0px -70% 0px' },
  )
  headings.forEach(h => observer.observe(h))
}

// ── Copy buttons ──────────────────────────────────────────────────────────────
function addCopyButtons(container) {
  container.querySelectorAll('pre').forEach(pre => {
    const btn = document.createElement('button')
    btn.className = 'copy-btn'
    btn.textContent = 'Copy'
    btn.addEventListener('click', async () => {
      const code = pre.querySelector('code')?.textContent ?? ''
      await navigator.clipboard.writeText(code)
      btn.textContent = 'Copied!'
      btn.classList.add('copied')
      setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied') }, 2000)
    })
    pre.appendChild(btn)
  })
}

// ── Render a doc ──────────────────────────────────────────────────────────────
function renderDoc(slug) {
  const doc = docs.find(d => d.slug === slug)
  if (!doc) { renderHome(); return }

  const section = SECTIONS.find(s => doc.num >= s.range[0] && doc.num <= s.range[1])
  breadcrumb.textContent = section ? `${section.name} / ${doc.title}` : doc.title

  const html = marked.parse(doc.content)
  content.innerHTML = `<article class="doc-content">${html}</article>`

  buildToc(content.querySelector('article'))
  addCopyButtons(content)
  content.scrollTop = 0
  window.scrollTo({ top: 0 })

  document.title = `${doc.title} — HeadlessKit`
}

// ── Home page ─────────────────────────────────────────────────────────────────
function renderHome() {
  breadcrumb.textContent = ''
  toc.innerHTML = ''
  tocPanel.style.display = 'none'
  document.title = 'HeadlessKit — Documentation'

  let cardsHtml = ''
  for (const section of SECTIONS) {
    const sectionDocs = docs.filter(d => d.num >= section.range[0] && d.num <= section.range[1])
    cardsHtml += `
      <div class="home-section-title">${section.name}</div>
      <div class="home-cards">
        ${sectionDocs.map(d => `
          <a href="#${d.slug}" class="home-card">
            <div class="home-card-num">${String(d.num).padStart(2, '0')}</div>
            <div class="home-card-title">${d.title}</div>
          </a>
        `).join('')}
      </div>
    `
  }

  content.innerHTML = `
    <div class="home">
      <div class="home-hero">
        <h1>◈ HeadlessKit</h1>
        <p>Framework-agnostic form state engine with first-class React bindings — plus integrated TanStack Query and state management support.</p>
      </div>
      ${cardsHtml}
    </div>
  `
}

// ── Router ────────────────────────────────────────────────────────────────────
function route() {
  const slug = location.hash.slice(1)
  renderNav(searchEl.value)
  slug ? renderDoc(slug) : renderHome()
}

// ── Events ────────────────────────────────────────────────────────────────────
window.addEventListener('hashchange', route)

searchEl.addEventListener('input', () => renderNav(searchEl.value))

menuBtn.addEventListener('click', () => {
  sidebar.classList.toggle('open')
  overlay.classList.toggle('visible')
})

overlay.addEventListener('click', () => {
  sidebar.classList.remove('open')
  overlay.classList.remove('visible')
})

// Close sidebar on nav click (mobile)
nav.addEventListener('click', e => {
  if (e.target.closest('.nav-item')) {
    sidebar.classList.remove('open')
    overlay.classList.remove('visible')
  }
})

// ── Boot ──────────────────────────────────────────────────────────────────────
route()
