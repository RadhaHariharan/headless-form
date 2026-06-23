import type { QueryClient, Query, Mutation } from '@headless-form/query-core'
import { onlineManager } from '@headless-form/query-core'
import { DEVTOOLS_CSS } from './styles'
import { renderExplorer } from './explorer'

export type ButtonPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
export type PanelPosition  = 'bottom' | 'top' | 'left' | 'right'
export type Theme          = 'dark' | 'light' | 'system'
export type SortFn         = 'status' | 'updated' | 'observed' | 'key'

export interface QueryDevtoolsConfig {
  client: QueryClient
  buttonPosition?: ButtonPosition
  position?: PanelPosition
  initialOpen?: boolean
  theme?: Theme
  queryFlavor?: string
  version?: string
}

const LS_PREFIX = 'hf-qdt:'
function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(LS_PREFIX + key); return v !== null ? (JSON.parse(v) as T) : fallback }
  catch { return fallback }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(val)) } catch { /* noop */ }
}

const LOGO_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="#58a6ff" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="#58a6ff"/><line x1="12" y1="2" x2="12" y2="8" stroke="#58a6ff" stroke-width="2"/><line x1="12" y1="16" x2="12" y2="22" stroke="#58a6ff" stroke-width="2"/><line x1="2" y1="12" x2="8" y2="12" stroke="#58a6ff" stroke-width="2"/><line x1="16" y1="12" x2="22" y2="12" stroke="#58a6ff" stroke-width="2"/></svg>`
const SEARCH_SVG = `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5"/><line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
const CLOSE_SVG = `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`

type QueryStatus = 'fresh' | 'fetching' | 'paused' | 'stale' | 'inactive'

function getQueryStatus(q: Query<any, any, any, any>): QueryStatus {
  if (q.getObserversCount() === 0) return 'inactive'
  if (q.state.fetchStatus === 'paused') return 'paused'
  if (q.state.fetchStatus === 'fetching') return 'fetching'
  if (q.isStale()) return 'stale'
  return 'fresh'
}

function statusOrder(s: QueryStatus): number {
  return ({ fetching: 0, paused: 1, stale: 2, inactive: 3, fresh: 4 } as Record<QueryStatus, number>)[s] ?? 5
}

function relTime(ts: number | undefined): string {
  if (!ts) return '—'
  const d = Date.now() - ts
  if (d < 1000) return 'now'
  if (d < 60000) return `${Math.floor(d / 1000)}s`
  return `${Math.floor(d / 60000)}m`
}

function escHtml(s: string): string {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

export class QueryDevtools {
  private client: QueryClient
  private host!: HTMLElement
  private shadow!: ShadowRoot
  private unsub?: () => void
  private unsubOnline?: () => void
  private tickTimer?: ReturnType<typeof setInterval>

  private isOpen: boolean
  private position: PanelPosition
  private buttonPosition: ButtonPosition
  private theme: Theme
  private panelSize: number
  private activeTab: 'queries' | 'mutations' | 'settings' = 'queries'
  private search = ''
  private statusFilter: QueryStatus | 'all' = 'all'
  private sortFn: SortFn = 'status'
  private selectedQueryHash: string | null = null
  private selectedMutationIdx: number | null = null

  constructor(config: QueryDevtoolsConfig) {
    this.client = config.client
    this.isOpen         = lsGet('open', config.initialOpen ?? false)
    this.position       = lsGet('pos', config.position ?? 'bottom')
    this.buttonPosition = lsGet('btnpos', config.buttonPosition ?? 'bottom-right')
    this.theme          = lsGet('theme', config.theme ?? 'dark')
    this.panelSize      = lsGet('size', 360)
    this.sortFn         = lsGet('sort', 'status')
    this.statusFilter   = lsGet('filter', 'all')
    this.mount()
  }

  private mount() {
    this.host = document.createElement('div')
    this.host.style.cssText = 'all:initial;position:fixed;z-index:99997;pointer-events:none;'
    this.shadow = this.host.attachShadow({ mode: 'open' })
    document.body.appendChild(this.host)
    const style = document.createElement('style')
    style.textContent = DEVTOOLS_CSS
    this.shadow.appendChild(style)
    this.render()
    this.unsub = this.client.getQueryCache().subscribe(() => this.scheduleRender())
    this.unsubOnline = onlineManager.subscribe(() => this.updateOnlinePill())
    this.tickTimer = setInterval(() => this.updateAges(), 5000)
  }

  unmount() {
    this.unsub?.()
    this.unsubOnline?.()
    clearInterval(this.tickTimer)
    this.host.remove()
  }

  private _pending = false
  private scheduleRender() {
    if (this._pending) return
    this._pending = true
    queueMicrotask(() => { this._pending = false; this.render() })
  }

  private render() {
    this.applyTheme()
    this.renderToggleBtn()
    this.renderPanel()
  }

  private applyTheme() {
    const resolved = this.theme === 'system'
      ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : this.theme
    this.shadow.host.setAttribute('data-theme', resolved)
  }

  private renderToggleBtn() {
    let btn = this.shadow.querySelector<HTMLElement>('.toggle-btn')
    if (!btn) {
      btn = document.createElement('button')
      btn.innerHTML = `${LOGO_SVG}<span class="badge"></span>`
      btn.style.pointerEvents = 'auto'
      btn.addEventListener('click', () => this.toggleOpen())
      this.shadow.appendChild(btn)
    }
    btn.className = `toggle-btn ${this.buttonPosition}`
    const fetching = this.client.getQueryCache().getAll().filter(q => q.state.fetchStatus === 'fetching').length
    const badge = btn.querySelector<HTMLElement>('.badge')!
    badge.textContent = fetching > 0 ? String(fetching) : ''
    badge.classList.toggle('vis', fetching > 0)
  }

  private renderPanel() {
    let panel = this.shadow.querySelector<HTMLElement>('.panel')
    if (!panel) { panel = this.buildPanel(); this.shadow.appendChild(panel) }
    panel.className = `panel ${this.position}${this.isOpen ? '' : ' hidden'}`
    this.applySizeToPanel(panel)
    if (this.isOpen) {
      this.renderPanelHeader(panel)
      this.renderPanelBody(panel)
      this.renderStatBar(panel)
    }
  }

  private buildPanel(): HTMLElement {
    const panel = document.createElement('div')
    panel.style.pointerEvents = 'auto'
    const rh = document.createElement('div')
    rh.className = 'rh'
    panel.appendChild(rh)
    this.wireResize(rh, panel)
    const inner = document.createElement('div')
    inner.className = 'panel-inner'
    inner.innerHTML = `<div class="ph"></div><div class="panel-body" style="flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0;"></div><div class="stb"></div>`
    panel.appendChild(inner)
    return panel
  }

  private applySizeToPanel(panel: HTMLElement) {
    const sz = Math.max(200, Math.min(this.panelSize, 800))
    const s = panel.style
    s.cssText = s.cssText.replace(/;\s*(?:height|width|top|bottom|left|right):[^;]*/g, '')
    if (this.position === 'bottom') { s.height = `${sz}px`; s.left = '0'; s.right = '0'; s.top = 'auto'; s.width = 'auto' }
    if (this.position === 'top')    { s.height = `${sz}px`; s.left = '0'; s.right = '0'; s.bottom = 'auto'; s.width = 'auto' }
    if (this.position === 'left')   { s.width = `${sz}px`;  s.top = '0'; s.bottom = '0'; s.height = 'auto' }
    if (this.position === 'right')  { s.width = `${sz}px`;  s.top = '0'; s.bottom = '0'; s.height = 'auto' }
  }

  private wireResize(rh: HTMLElement, panel: HTMLElement) {
    let sY = 0, sX = 0, sz0 = 0
    const onMove = (e: MouseEvent) => {
      if (this.position === 'bottom') this.panelSize = Math.max(200, sz0 + (sY - e.clientY))
      if (this.position === 'top')    this.panelSize = Math.max(200, sz0 + (e.clientY - sY))
      if (this.position === 'left')   this.panelSize = Math.max(200, sz0 + (e.clientX - sX))
      if (this.position === 'right')  this.panelSize = Math.max(200, sz0 + (sX - e.clientX))
      lsSet('size', this.panelSize)
      this.applySizeToPanel(panel)
    }
    const onUp = () => { rh.classList.remove('drag'); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    rh.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault(); rh.classList.add('drag'); sY = e.clientY; sX = e.clientX; sz0 = this.panelSize
      document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
    })
  }

  private renderPanelHeader(panel: HTMLElement) {
    const ph = panel.querySelector<HTMLElement>('.ph')!
    const queries = this.client.getQueryCache().getAll()
    const mutations = this.client.getMutationCache().getAll()
    const isOnline = onlineManager.isOnline()
    ph.innerHTML = `
      <div class="ph-logo">${LOGO_SVG}<span>Query Devtools</span></div>
      <div class="ph-tabs">
        <button class="tab-btn ${this.activeTab === 'queries' ? 'on' : ''}" data-tab="queries">Queries <span class="cnt">${queries.length}</span></button>
        <button class="tab-btn ${this.activeTab === 'mutations' ? 'on' : ''}" data-tab="mutations">Mutations <span class="cnt">${mutations.length}</span></button>
        <button class="tab-btn ${this.activeTab === 'settings' ? 'on' : ''}" data-tab="settings">Settings</button>
      </div>
      <div class="ph-right">
        <div class="online-pill ${isOnline ? 'on' : 'off'}" id="op"><span class="online-dot"></span>${isOnline ? 'Online' : 'Offline'}</div>
        <button class="ib" id="cb">${CLOSE_SVG}</button>
      </div>`
    ph.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach(b => b.addEventListener('click', () => { this.activeTab = b.dataset['tab'] as typeof this.activeTab; this.scheduleRender() }))
    ph.querySelector('#op')?.addEventListener('click', () => onlineManager.setOnline(!onlineManager.isOnline()))
    ph.querySelector('#cb')?.addEventListener('click', () => { this.isOpen = false; lsSet('open', false); this.render() })
  }

  private renderPanelBody(panel: HTMLElement) {
    const body = panel.querySelector<HTMLElement>('.panel-body')!
    if (this.activeTab === 'queries')   this.renderQueriesView(body)
    else if (this.activeTab === 'mutations') this.renderMutationsView(body)
    else if (this.activeTab === 'settings') this.renderSettingsView(body)
  }

  private renderQueriesView(container: HTMLElement) {
    if (!container.querySelector('.qv')) {
      container.innerHTML = `
        <div class="qv">
          <div class="ls">
            <div class="lt">
              <div class="sb">${SEARCH_SVG}<input placeholder="Filter queries…" class="q-search"/></div>
              <div class="lc">
                <button class="fb all" data-f="all">All</button>
                <button class="fb fresh" data-f="fresh">Fresh</button>
                <button class="fb fetching" data-f="fetching">Fetching</button>
                <button class="fb paused" data-f="paused">Paused</button>
                <button class="fb stale" data-f="stale">Stale</button>
                <button class="fb inactive" data-f="inactive">Inactive</button>
                <select class="ss"><option value="status">Status</option><option value="updated">Updated</option><option value="observed">Observed</option><option value="key">Key</option></select>
              </div>
            </div>
            <div class="ql q-list"></div>
          </div>
          <div class="ds q-detail"><div class="ns">← Select a query</div></div>
        </div>`

      const inp = container.querySelector<HTMLInputElement>('.q-search')!
      inp.value = this.search
      inp.addEventListener('input', e => { this.search = (e.target as HTMLInputElement).value; this.renderQueryList(container) })

      container.querySelectorAll<HTMLButtonElement>('.fb').forEach(b => b.addEventListener('click', () => {
        this.statusFilter = b.dataset['f'] as typeof this.statusFilter
        lsSet('filter', this.statusFilter)
        container.querySelectorAll('.fb').forEach(x => x.classList.remove('on')); b.classList.add('on')
        this.renderQueryList(container)
      }))

      const sortEl = container.querySelector<HTMLSelectElement>('.ss')!
      sortEl.value = this.sortFn
      sortEl.addEventListener('change', () => { this.sortFn = sortEl.value as SortFn; lsSet('sort', this.sortFn); this.renderQueryList(container) })
    }

    // restore active filter badge
    container.querySelectorAll('.fb').forEach(b => b.classList.toggle('on', (b as HTMLElement).dataset['f'] === this.statusFilter))
    this.renderQueryList(container)
  }

  private renderQueryList(container: HTMLElement) {
    const list = container.querySelector<HTMLElement>('.q-list')!
    const queries = this.filteredAndSorted()
    if (queries.length === 0) {
      list.innerHTML = `<div class="empty">${this.search || this.statusFilter !== 'all' ? 'No matches' : 'No queries yet'}</div>`
    } else {
      list.innerHTML = queries.map(q => {
        const s = getQueryStatus(q)
        const sel = q.queryHash === this.selectedQueryHash ? ' sel' : ''
        return `<div class="qr${sel}" data-hash="${escHtml(q.queryHash)}"><span class="sd ${s}"></span><span class="qk" title="${escHtml(JSON.stringify(q.queryKey))}">${escHtml(JSON.stringify(q.queryKey))}</span><span class="oc">${q.getObserversCount()}</span><span class="qa">${relTime(q.state.dataUpdatedAt || undefined)}</span></div>`
      }).join('')
      list.querySelectorAll<HTMLElement>('.qr').forEach(row => row.addEventListener('click', () => {
        this.selectedQueryHash = row.dataset['hash'] ?? null
        this.renderQueryList(container)
        this.renderQueryDetail(container)
      }))
    }
    this.renderQueryDetail(container)
  }

  private renderQueryDetail(container: HTMLElement) {
    const detail = container.querySelector<HTMLElement>('.q-detail')!
    if (!this.selectedQueryHash) { detail.innerHTML = `<div class="ns">← Select a query</div>`; return }
    const q = this.client.getQueryCache().get(this.selectedQueryHash)
    if (!q) { detail.innerHTML = `<div class="ns">Query not found</div>`; return }
    const s = getQueryStatus(q), st = q.state
    detail.innerHTML = `
      <div class="dh">
        <div class="dk">${escHtml(JSON.stringify(q.queryKey))}</div>
        <div class="dm">
          <span class="mc ${s}">${s}</span>
          <span class="mc ${st.fetchStatus !== 'idle' ? 'fetching' : 'info'}">${st.fetchStatus}</span>
          ${q.getObserversCount() > 0 ? `<span class="mc info">${q.getObserversCount()} observer${q.getObserversCount() !== 1 ? 's' : ''}</span>` : ''}
        </div>
      </div>
      <div class="da">
        <button class="ab" data-a="refetch">Refetch</button>
        <button class="ab" data-a="invalidate">Invalidate</button>
        <button class="ab" data-a="reset">Reset</button>
        <button class="ab danger" data-a="remove">Remove</button>
      </div>
      <div class="db">
        <div class="sec"><div class="sec-t">Info</div>
          <div class="info-g">
            <span class="info-l">Status</span><span class="info-v ${s}">${st.status}</span>
            <span class="info-l">Fetch status</span><span class="info-v">${st.fetchStatus}</span>
            <span class="info-l">Observers</span><span class="info-v">${q.getObserversCount()}</span>
            <span class="info-l">Is stale</span><span class="info-v ${q.isStale() ? 'warn' : 'ok'}">${q.isStale()}</span>
            <span class="info-l">Failures</span><span class="info-v ${st.fetchFailureCount > 0 ? 'err' : ''}">${st.fetchFailureCount}</span>
            <span class="info-l">Data updated</span><span class="info-v">${st.dataUpdatedAt ? new Date(st.dataUpdatedAt).toLocaleTimeString() : '—'}</span>
          </div>
        </div>
        ${st.error ? `<div class="sec"><div class="sec-t">Error</div><div id="qd-err"></div></div>` : ''}
        <div class="sec"><div class="sec-t">Data</div><div id="qd-data"></div></div>
        <div class="sec"><div class="sec-t">Query Key</div><div id="qd-key"></div></div>
      </div>`

    detail.querySelectorAll<HTMLButtonElement>('.ab').forEach(btn => btn.addEventListener('click', async () => {
      const a = btn.dataset['a']
      if (a === 'refetch')    await q.fetch()
      if (a === 'invalidate') await this.client.invalidateQueries({ queryKey: q.queryKey, exact: true })
      if (a === 'reset')      q.setState(q.initialState as Parameters<typeof q.setState>[0])
      if (a === 'remove')     { this.client.getQueryCache().remove(q); this.selectedQueryHash = null; this.scheduleRender() }
    }))

    const dataEl = detail.querySelector<HTMLElement>('#qd-data')
    if (dataEl) renderExplorer(st.data, dataEl)
    const keyEl = detail.querySelector<HTMLElement>('#qd-key')
    if (keyEl) renderExplorer(q.queryKey, keyEl)
    const errEl = detail.querySelector<HTMLElement>('#qd-err')
    if (errEl) renderExplorer(st.error, errEl)
  }

  private renderMutationsView(container: HTMLElement) {
    const mutations = this.client.getMutationCache().getAll()
    const sel = this.selectedMutationIdx
    container.innerHTML = `
      <div class="qv">
        <div class="ls">
          <div class="lt"><div class="sb">${SEARCH_SVG}<input placeholder="Filter mutations…" class="m-search"/></div></div>
          <div class="ql m-list">
            ${mutations.length === 0 ? '<div class="empty">No mutations yet</div>' :
              mutations.map((m, i) => {
                const st = m.state.status
                const dc = st === 'pending' ? 'pending' : st === 'success' ? 'success' : st === 'error' ? 'error' : 'idle'
                const k = JSON.stringify(m.options.mutationKey ?? '(anonymous)')
                return `<div class="mr${i === sel ? ' sel' : ''}" data-idx="${i}"><span class="md ${dc}"></span><span class="mk" title="${escHtml(k)}">${escHtml(k)}</span><span class="ms">${st}</span></div>`
              }).join('')}
          </div>
        </div>
        <div class="ds m-detail">${sel !== null && mutations[sel] ? '' : '<div class="ns">← Select a mutation</div>'}</div>
      </div>`

    container.querySelectorAll<HTMLElement>('.mr').forEach(row => row.addEventListener('click', () => {
      this.selectedMutationIdx = Number(row.dataset['idx']); this.renderMutationsView(container)
    }))

    if (sel !== null && mutations[sel]) {
      const m = mutations[sel]!
      const st = m.state, k = JSON.stringify(m.options.mutationKey ?? '(anonymous)')
      const detail = container.querySelector<HTMLElement>('.m-detail')!
      const sc = st.status === 'success' ? 'fresh' : st.status === 'error' ? 'error' : st.status === 'pending' ? 'fetching' : 'info'
      detail.innerHTML = `
        <div class="dh">
          <div class="dk">${escHtml(k)}</div>
          <div class="dm"><span class="mc ${sc}">${st.status}</span><span class="mc info">attempt ${st.failureCount + 1}</span></div>
        </div>
        <div class="db">
          ${st.error ? `<div class="sec"><div class="sec-t">Error</div><div id="md-err"></div></div>` : ''}
          <div class="sec"><div class="sec-t">Variables</div><div id="md-vars"></div></div>
          <div class="sec"><div class="sec-t">Data</div><div id="md-data"></div></div>
          <div class="sec"><div class="sec-t">Info</div>
            <div class="info-g">
              <span class="info-l">Status</span><span class="info-v">${st.status}</span>
              <span class="info-l">Failures</span><span class="info-v ${st.failureCount > 0 ? 'err' : ''}">${st.failureCount}</span>
              <span class="info-l">Submitted at</span><span class="info-v">${st.submittedAt ? new Date(st.submittedAt).toLocaleTimeString() : '—'}</span>
            </div>
          </div>
        </div>`
      const ve = detail.querySelector<HTMLElement>('#md-vars'); if (ve) renderExplorer(st.variables, ve)
      const de = detail.querySelector<HTMLElement>('#md-data'); if (de) renderExplorer(st.data, de)
      const ee = detail.querySelector<HTMLElement>('#md-err');  if (ee) renderExplorer(st.error, ee)
    }
  }

  private renderSettingsView(container: HTMLElement) {
    container.innerHTML = `
      <div class="sv">
        <div class="sg"><div class="sg-t">Theme</div>
          <div class="sr"><span class="sl">Color theme</span>
            <div class="rg">
              <button class="rb ${this.theme === 'dark' ? 'on' : ''}" data-t="dark">Dark</button>
              <button class="rb ${this.theme === 'light' ? 'on' : ''}" data-t="light">Light</button>
              <button class="rb ${this.theme === 'system' ? 'on' : ''}" data-t="system">System</button>
            </div>
          </div>
        </div>
        <div class="sg"><div class="sg-t">Panel position</div>
          <div class="sr"><span class="sl">Dock side</span>
            <div class="rg">
              <button class="rb ${this.position === 'bottom' ? 'on':''}" data-p="bottom">Bottom</button>
              <button class="rb ${this.position === 'top'    ? 'on':''}" data-p="top">Top</button>
              <button class="rb ${this.position === 'left'   ? 'on':''}" data-p="left">Left</button>
              <button class="rb ${this.position === 'right'  ? 'on':''}" data-p="right">Right</button>
            </div>
          </div>
          <div class="sr"><span class="sl">Button position</span>
            <div class="rg">
              <button class="rb ${this.buttonPosition === 'bottom-right' ? 'on':''}" data-bp="bottom-right">↘ BR</button>
              <button class="rb ${this.buttonPosition === 'bottom-left'  ? 'on':''}" data-bp="bottom-left">↙ BL</button>
              <button class="rb ${this.buttonPosition === 'top-right'    ? 'on':''}" data-bp="top-right">↗ TR</button>
              <button class="rb ${this.buttonPosition === 'top-left'     ? 'on':''}" data-bp="top-left">↖ TL</button>
            </div>
          </div>
        </div>
        <div class="sg"><div class="sg-t">Cache actions</div>
          <div class="sr"><span class="sl">Clear all queries</span><button class="rb" id="cc">Clear cache</button></div>
        </div>
      </div>`

    container.querySelectorAll<HTMLButtonElement>('[data-t]').forEach(b => b.addEventListener('click', () => { this.theme = b.dataset['t'] as Theme; lsSet('theme', this.theme); this.scheduleRender() }))
    container.querySelectorAll<HTMLButtonElement>('[data-p]').forEach(b => b.addEventListener('click', () => { this.position = b.dataset['p'] as PanelPosition; lsSet('pos', this.position); this.shadow.querySelector('.panel')?.remove(); this.scheduleRender() }))
    container.querySelectorAll<HTMLButtonElement>('[data-bp]').forEach(b => b.addEventListener('click', () => { this.buttonPosition = b.dataset['bp'] as ButtonPosition; lsSet('btnpos', this.buttonPosition); this.scheduleRender() }))
    container.querySelector('#cc')?.addEventListener('click', () => { this.client.clear(); this.selectedQueryHash = null; this.scheduleRender() })
  }

  private renderStatBar(panel: HTMLElement) {
    const stb = panel.querySelector<HTMLElement>('.stb')!
    const counts: Record<QueryStatus, number> = { fresh: 0, fetching: 0, paused: 0, stale: 0, inactive: 0 }
    for (const q of this.client.getQueryCache().getAll()) counts[getQueryStatus(q)]++
    stb.innerHTML = (Object.entries(counts) as [QueryStatus, number][]).map(([s, n]) =>
      `<div class="sti"><span class="std ${s}"></span><span class="stc">${n}</span><span class="stl">${s}</span></div>`
    ).join('')
  }

  private updateOnlinePill() {
    const pill = this.shadow.querySelector<HTMLElement>('.online-pill')
    if (!pill) return
    const on = onlineManager.isOnline()
    pill.className = `online-pill ${on ? 'on' : 'off'}`
    pill.innerHTML = `<span class="online-dot"></span>${on ? 'Online' : 'Offline'}`
  }

  private updateAges() {
    if (!this.isOpen || this.activeTab !== 'queries') return
    const body = this.shadow.querySelector<HTMLElement>('.panel-body')
    if (body) this.renderQueryList(body)
  }

  private toggleOpen() {
    this.isOpen = !this.isOpen; lsSet('open', this.isOpen); this.render()
  }

  private filteredAndSorted() {
    let qs = this.client.getQueryCache().getAll()
    if (this.statusFilter !== 'all') qs = qs.filter(q => getQueryStatus(q) === this.statusFilter)
    if (this.search.trim()) { const s = this.search.toLowerCase(); qs = qs.filter(q => JSON.stringify(q.queryKey).toLowerCase().includes(s)) }
    return [...qs].sort((a, b) => {
      if (this.sortFn === 'status')   return statusOrder(getQueryStatus(a)) - statusOrder(getQueryStatus(b))
      if (this.sortFn === 'updated')  return (b.state.dataUpdatedAt ?? 0) - (a.state.dataUpdatedAt ?? 0)
      if (this.sortFn === 'observed') return b.getObserversCount() - a.getObserversCount()
      if (this.sortFn === 'key')      return JSON.stringify(a.queryKey).localeCompare(JSON.stringify(b.queryKey))
      return 0
    })
  }

  setClient(c: QueryClient) { this.unsub?.(); this.client = c; this.unsub = c.getQueryCache().subscribe(() => this.scheduleRender()); this.scheduleRender() }
  setButtonPosition(p: ButtonPosition) { this.buttonPosition = p; lsSet('btnpos', p); this.scheduleRender() }
  setPosition(p: PanelPosition) { this.position = p; lsSet('pos', p); this.shadow.querySelector('.panel')?.remove(); this.scheduleRender() }
  setTheme(t: Theme) { this.theme = t; lsSet('theme', t); this.scheduleRender() }
  setInitialIsOpen(o: boolean) { this.isOpen = o; lsSet('open', o); this.scheduleRender() }
}
