import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'

// ── Load all docs eagerly, grouped by package folder (any depth under it) ──────
const rawDocs = import.meta.glob('../../../docs/**/*.mdx', { query: '?raw', import: 'default', eager: true })

// ── Package metadata (curated — display name, group, description) ─────────────
const PACKAGE_META = {
  'forms': {
    name: 'forms',
    npm: '@headlesskit/forms',
    group: 'Forms',
    description: 'Framework-agnostic form state engine. Zero runtime dependencies.',
  },
  'forms-react': {
    name: 'forms-react',
    npm: '@headlesskit/forms-react',
    group: 'Forms',
    description: 'React 18 bindings via useSyncExternalStore.',
  },
  'forms-react-native': {
    name: 'forms-react-native',
    npm: '@headlesskit/forms-react-native',
    group: 'Forms',
    description: 'React Native prop adapters built on top of forms-react.',
  },
  'state-management': {
    name: 'state-management',
    npm: '@headlesskit/state-management',
    group: 'State Management',
    description: 'Predictable state container, API-compatible with Redux v5.',
  },
  'state-management-toolkit': {
    name: 'state-management-toolkit',
    npm: '@headlesskit/state-management-toolkit',
    group: 'State Management',
    description: 'Slices, async thunks, entities, listener middleware, and a data-fetching layer.',
  },
  'query-core': {
    name: 'query-core',
    npm: '@headlesskit/query-core',
    group: 'Query',
    description: 'Framework-agnostic async state and cache management engine.',
  },
  'query-persist-client-core': {
    name: 'query-persist-client-core',
    npm: '@headlesskit/query-persist-client-core',
    group: 'Query',
    description: 'Persist a query cache to storage and restore it on reload.',
  },
  'query-async-storage-persister': {
    name: 'query-async-storage-persister',
    npm: '@headlesskit/query-async-storage-persister',
    group: 'Query',
    description: 'A persister backed by an async key-value store (e.g. AsyncStorage).',
  },
  'query-sync-storage-persister': {
    name: 'query-sync-storage-persister',
    npm: '@headlesskit/query-sync-storage-persister',
    group: 'Query',
    description: 'A persister backed by a synchronous key-value store (e.g. localStorage).',
  },
}

const GROUP_ORDER = ['Forms', 'State Management', 'Query']

// ── Parse into structured list, grouped by package ──────────────────────────────
// Path shape: .../docs/<package>/[<folder>/.../]<NN-slug>.mdx
// <folder> (everything between the package and the filename) mirrors the real
// src/ layout — e.g. docs/state-management/utils/03-is-action.mdx renders an
// "utils" group in the sidebar containing is-action, etc.
const docsByPackage = {}

for (const [path, content] of Object.entries(rawDocs)) {
  const parts = path.split('/')
  const docsIndex = parts.indexOf('docs')
  const pkg = parts[docsIndex + 1]
  const filename = parts[parts.length - 1].replace('.mdx', '')
  const folder = parts.slice(docsIndex + 2, -1).join('/') // '' when the doc is at the package root

  const num = parseInt(filename.split('-')[0], 10)
  const slug = filename.replace(/^\d+-/, '')
  const docSlug = folder ? `${folder}/${slug}` : slug
  const title = content.match(/^# (.+)$/m)?.[1] ?? slug.replace(/-/g, ' ')

  docsByPackage[pkg] ??= []
  docsByPackage[pkg].push({ pkg, folder, num, slug: docSlug, title, content })
}

for (const pkg of Object.keys(docsByPackage)) {
  // Root-level docs (folder === '') first, then folders alphabetically; numeric
  // order within each.
  docsByPackage[pkg].sort((a, b) => a.folder.localeCompare(b.folder) || a.num - b.num)
}

const PACKAGES = Object.keys(docsByPackage)
  .filter((pkg) => docsByPackage[pkg].length > 0)
  .map((pkg) => ({ slug: pkg, docs: docsByPackage[pkg], ...PACKAGE_META[pkg] }))
  .sort((a, b) => {
    const groupDiff = GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)
    return groupDiff !== 0 ? groupDiff : a.name.localeCompare(b.name)
  })

function getPackage(slug) {
  return PACKAGES.find((p) => p.slug === slug) ?? null
}

function getDoc(pkgSlug, docSlug) {
  const pkg = getPackage(pkgSlug)
  if (!pkg) return null
  return pkg.docs.find((d) => d.slug === docSlug) ?? null
}

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

function slugifyHeadingHtml(html) {
  return html
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

marked.use({
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens)
      const id = slugifyHeadingHtml(text)
      return `<h${depth} id="${id}">${text}</h${depth}>\n`
    },
  },
})

// ── Static heading extraction (for the sidebar accordion, before a doc is mounted) ──
function extractHeadings(markdown) {
  const headings = []
  let inFence = false
  for (const line of markdown.split('\n')) {
    if (/^```/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const m = /^(#{2,3})\s+(.+)$/.exec(line)
    if (!m) continue
    const html = marked.parseInline(m[2].trim())
    headings.push({
      depth: m[1].length,
      id: slugifyHeadingHtml(html),
      text: html.replace(/<[^>]+>/g, ''),
    })
  }
  return headings
}

// ── DOM refs ──────────────────────────────────────────────────────────────────
const nav             = document.getElementById('nav')
const content         = document.getElementById('content')
const toc              = document.getElementById('toc')
const tocPanel          = document.getElementById('toc-panel')
const searchEl          = document.getElementById('search')
const breadcrumb        = document.getElementById('breadcrumb')
const menuBtn           = document.getElementById('menu-btn')
const sidebar           = document.getElementById('sidebar')
const overlay           = document.getElementById('overlay')
const packageSwitcher   = document.getElementById('package-switcher')
const packageSwitcherName = document.getElementById('package-switcher-name')
const packageMenu       = document.getElementById('package-menu')

// ── State ──────────────────────────────────────────────────────────────────────
const expandedDocs = new Set()
const expandedFolders = new Set()
let tocObserver = null

function folderLabel(folder) {
  // "query/core/buildMiddleware" -> "buildMiddleware" for the header, but keep the
  // full path as the group's identity so sibling folders with the same leaf name
  // (none currently, but defensively) don't collide.
  return folder.split('/').pop()
}

// ── Routing ────────────────────────────────────────────────────────────────────
// Hash formats: "" | "pkg" | "pkg/doc" | "pkg/doc:heading-id"
function parseHash() {
  const raw = location.hash.slice(1)
  if (!raw) return { pkg: null, doc: null, heading: null }

  const [pathPart, heading = null] = raw.split(':')
  const [pkg, doc = null] = pathPart.split('/')
  return { pkg: pkg || null, doc, heading }
}

function buildHash(pkg, doc, heading) {
  let hash = `#${pkg}`
  if (doc) hash += `/${doc}`
  if (heading) hash += `:${heading}`
  return hash
}

// ── Package switcher dropdown ──────────────────────────────────────────────────
function renderPackageMenu() {
  let html = ''
  for (const group of GROUP_ORDER) {
    const groupPackages = PACKAGES.filter((p) => p.group === group)
    if (groupPackages.length === 0) continue
    html += `<div class="package-menu-group"><div class="package-menu-group-title">${group}</div>`
    for (const p of groupPackages) {
      html += `
        <button class="package-menu-item" data-pkg="${p.slug}" role="option">
          <span class="package-menu-item-name">${p.name}</span>
          <span class="package-menu-item-desc">${p.description}</span>
        </button>`
    }
    html += `</div>`
  }
  packageMenu.innerHTML = html
}

function togglePackageMenu(open) {
  const next = open ?? packageMenu.hidden
  packageMenu.hidden = !next
  packageSwitcher.setAttribute('aria-expanded', String(next))
}

packageSwitcher.addEventListener('click', (e) => {
  e.stopPropagation()
  togglePackageMenu()
})

document.addEventListener('click', (e) => {
  if (!packageMenu.hidden && !packageMenu.contains(e.target) && e.target !== packageSwitcher) {
    togglePackageMenu(false)
  }
})

packageMenu.addEventListener('click', (e) => {
  const btn = e.target.closest('.package-menu-item')
  if (!btn) return
  togglePackageMenu(false)
  const pkg = getPackage(btn.dataset.pkg)
  if (pkg?.docs.length) {
    location.hash = buildHash(pkg.slug, pkg.docs[0].slug)
  }
})

// ── Sidebar rendering ─────────────────────────────────────────────────────────
function renderSidebar(filter = '') {
  const { pkg: activePkgSlug, doc: activeDocSlug } = parseHash()
  const q = filter.toLowerCase().trim()

  if (!activePkgSlug) {
    renderAllPackagesNav(q)
    return
  }

  const pkg = getPackage(activePkgSlug)
  if (!pkg) {
    renderAllPackagesNav(q)
    return
  }

  let anyResult = false

  // Render a single doc as an acc-item (used both for root-level docs and for
  // docs nested inside a folder group).
  function renderDocItem(doc) {
    const headings = extractHeadings(doc.content).filter((h) => h.depth === 2)
    const titleMatches = !q || doc.title.toLowerCase().includes(q)
    const matchingHeadings = q ? headings.filter((h) => h.text.toLowerCase().includes(q)) : headings
    if (q && !titleMatches && matchingHeadings.length === 0) return ''

    anyResult = true
    const isActive = doc.slug === activeDocSlug
    const isExpanded = expandedDocs.has(doc.slug) || isActive || (q && matchingHeadings.length > 0)

    return `<div class="acc-item">
      <div class="acc-row${isActive ? ' active' : ''}" data-doc="${doc.slug}">
        <button class="acc-toggle${isExpanded ? ' open' : ''}" data-toggle="${doc.slug}" aria-label="Toggle section">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
        <span class="acc-num">${String(doc.num).padStart(2, '0')}</span>
        <span class="acc-title">${doc.title}</span>
      </div>
      <div class="acc-sub" ${isExpanded ? '' : 'hidden'}>
        ${headings.map((h) => `
          <a href="${buildHash(pkg.slug, doc.slug, h.id)}" class="acc-sub-link${h.depth === 3 ? ' depth-3' : ''}${activeDocSlug === doc.slug && location.hash.split(':')[1] === h.id ? ' active' : ''}">${h.text}</a>
        `).join('')}
      </div>
    </div>`
  }

  // Group consecutive docs by folder (root-level docs have folder === '').
  let html = ''
  let i = 0
  while (i < pkg.docs.length) {
    const folder = pkg.docs[i].folder
    const groupDocs = []
    while (i < pkg.docs.length && pkg.docs[i].folder === folder) {
      groupDocs.push(pkg.docs[i])
      i++
    }

    if (folder === '') {
      html += groupDocs.map(renderDocItem).join('')
      continue
    }

    const itemsHtml = groupDocs.map(renderDocItem).join('')
    if (!itemsHtml) continue // every doc in this folder was filtered out by search

    const folderHasActive = groupDocs.some((d) => d.slug === activeDocSlug)
    const isFolderExpanded = expandedFolders.has(folder) || folderHasActive || q.length > 0

    html += `<div class="folder-group">
      <button class="folder-header${isFolderExpanded ? ' open' : ''}" data-folder-toggle="${folder}">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="folder-chevron">
          <path d="m9 6 6 6-6 6" />
        </svg>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="folder-icon">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
        </svg>
        <span class="folder-name">${folderLabel(folder)}/</span>
      </button>
      <div class="folder-body" ${isFolderExpanded ? '' : 'hidden'}>${itemsHtml}</div>
    </div>`
  }

  if (!anyResult) {
    html = `<div class="no-results">No results for "<strong>${filter}</strong>"</div>`
  }

  nav.innerHTML = html
}

function renderAllPackagesNav(q = '') {
  let html = ''
  let anyResult = false

  for (const group of GROUP_ORDER) {
    const groupPackages = PACKAGES.filter(
      (p) => p.group === group && (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)),
    )
    if (groupPackages.length === 0) continue
    anyResult = true
    html += `<div class="nav-section"><div class="nav-section-title">${group}</div>`
    for (const p of groupPackages) {
      html += `<a href="${buildHash(p.slug, p.docs[0]?.slug)}" class="nav-item">${p.name}</a>`
    }
    html += `</div>`
  }

  if (!anyResult) {
    html = `<div class="no-results">No results for "<strong>${q}</strong>"</div>`
  }

  nav.innerHTML = html
}

nav.addEventListener('click', (e) => {
  const folderBtn = e.target.closest('[data-folder-toggle]')
  if (folderBtn) {
    e.stopPropagation()
    const folder = folderBtn.dataset.folderToggle
    if (expandedFolders.has(folder)) expandedFolders.delete(folder)
    else expandedFolders.add(folder)
    renderSidebar(searchEl.value)
    return
  }

  const toggleBtn = e.target.closest('[data-toggle]')
  if (toggleBtn) {
    e.stopPropagation()
    const slug = toggleBtn.dataset.toggle
    if (expandedDocs.has(slug)) expandedDocs.delete(slug)
    else expandedDocs.add(slug)
    renderSidebar(searchEl.value)
    return
  }

  const row = e.target.closest('[data-doc]')
  if (row) {
    const { pkg } = parseHash()
    location.hash = buildHash(pkg, row.dataset.doc)
    closeMobileSidebar()
    return
  }

  if (e.target.closest('.nav-item, .home-card')) {
    closeMobileSidebar()
  }
})

function closeMobileSidebar() {
  sidebar.classList.remove('open')
  overlay.classList.remove('visible')
}

// ── ToC building (right rail, current doc only) ────────────────────────────────
function buildToc(container, activeHeadingId) {
  const headings = container.querySelectorAll('h2, h3')
  if (headings.length < 2) {
    tocPanel.style.display = 'none'
    return
  }
  tocPanel.style.display = ''
  let tocHtml = ''
  for (const h of headings) {
    const cls = h.tagName === 'H2' ? 'toc-h2' : 'toc-h3'
    tocHtml += `<a href="#" data-jump="${h.id}" class="${cls}${h.id === activeHeadingId ? ' active' : ''}">${h.textContent}</a>`
  }
  toc.innerHTML = tocHtml

  if (tocObserver) tocObserver.disconnect()

  const links = Array.from(toc.querySelectorAll('a'))
  tocObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          links.forEach((l) => l.classList.remove('active'))
          const link = links.find((l) => l.dataset.jump === entry.target.id)
          link?.classList.add('active')
        }
      }
    },
    { rootMargin: '0px 0px -70% 0px' },
  )
  headings.forEach((h) => tocObserver.observe(h))
}

toc.addEventListener('click', (e) => {
  const link = e.target.closest('[data-jump]')
  if (!link) return
  e.preventDefault()
  const { pkg, doc } = parseHash()
  history.replaceState(null, '', buildHash(pkg, doc, link.dataset.jump))
  document.getElementById(link.dataset.jump)?.scrollIntoView({ block: 'start' })
})

// ── Copy buttons ──────────────────────────────────────────────────────────────
function addCopyButtons(container) {
  container.querySelectorAll('pre').forEach((pre) => {
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

// ── Prev/Next footer ───────────────────────────────────────────────────────────
function buildFooterNav(pkg, doc) {
  const idx = pkg.docs.findIndex((d) => d.slug === doc.slug)
  const prevDoc = idx > 0 ? pkg.docs[idx - 1] : null
  const nextDoc = idx < pkg.docs.length - 1 ? pkg.docs[idx + 1] : null

  if (!prevDoc && !nextDoc) return ''

  return `
    <nav class="doc-footer-nav">
      ${prevDoc ? `
        <a href="${buildHash(pkg.slug, prevDoc.slug)}" class="footer-nav-link footer-nav-prev">
          <span class="footer-nav-label">← Previous</span>
          <span class="footer-nav-title">${prevDoc.title}</span>
        </a>` : '<span class="footer-nav-spacer"></span>'}
      ${nextDoc ? `
        <a href="${buildHash(pkg.slug, nextDoc.slug)}" class="footer-nav-link footer-nav-next">
          <span class="footer-nav-label">Next →</span>
          <span class="footer-nav-title">${nextDoc.title}</span>
        </a>` : ''}
    </nav>`
}

// ── Render a doc ──────────────────────────────────────────────────────────────
function renderDoc(pkg, doc, headingId) {
  breadcrumb.textContent = `${pkg.name} / ${doc.title}`

  const html = marked.parse(doc.content)
  content.innerHTML = `<article class="doc-content">${html}</article>${buildFooterNav(pkg, doc)}`

  const article = content.querySelector('article')
  buildToc(article, headingId)
  addCopyButtons(content)

  if (headingId) {
    document.getElementById(headingId)?.scrollIntoView({ block: 'start' })
  } else {
    content.scrollTop = 0
    window.scrollTo({ top: 0 })
  }

  document.title = `${doc.title} — ${pkg.name} — HeadlessKit`
}

// ── Packages landing page ──────────────────────────────────────────────────────
function renderLanding() {
  breadcrumb.textContent = ''
  toc.innerHTML = ''
  tocPanel.style.display = 'none'
  document.title = 'HeadlessKit — Documentation'

  let cardsHtml = ''
  for (const group of GROUP_ORDER) {
    const groupPackages = PACKAGES.filter((p) => p.group === group)
    if (groupPackages.length === 0) continue
    cardsHtml += `
      <div class="home-section-title">${group}</div>
      <div class="home-cards">
        ${groupPackages.map((p) => `
          <a href="${buildHash(p.slug, p.docs[0]?.slug)}" class="home-card package-card">
            <div class="home-card-title">${p.name}</div>
            <div class="package-card-npm">${p.npm}</div>
            <div class="package-card-desc">${p.description}</div>
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
  const { pkg: pkgSlug, doc: docSlug, heading } = parseHash()
  const pkg = pkgSlug ? getPackage(pkgSlug) : null

  packageSwitcherName.textContent = pkg ? pkg.name : 'All packages'

  renderSidebar(searchEl.value)

  if (!pkg) {
    renderLanding()
    return
  }

  const doc = docSlug ? getDoc(pkg.slug, docSlug) : pkg.docs[0]
  if (!doc) {
    renderLanding()
    return
  }

  renderDoc(pkg, doc, heading)
}

// ── Events ────────────────────────────────────────────────────────────────────
window.addEventListener('hashchange', route)

searchEl.addEventListener('input', () => renderSidebar(searchEl.value))

menuBtn.addEventListener('click', () => {
  sidebar.classList.toggle('open')
  overlay.classList.toggle('visible')
})

overlay.addEventListener('click', closeMobileSidebar)

// ── Boot ──────────────────────────────────────────────────────────────────────
renderPackageMenu()
route()
