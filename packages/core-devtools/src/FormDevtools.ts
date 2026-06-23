import type { FormStoreApi } from '@headless-form/core'
import { FORM_DEVTOOLS_CSS } from './styles'
import { renderExplorer } from './explorer'

export type ButtonPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
export type PanelPosition  = 'bottom' | 'top' | 'left' | 'right'
export type Theme          = 'dark' | 'light' | 'system'

export interface FormDevtoolsConfig {
  form: FormStoreApi<any, any, any>
  label?: string
  buttonPosition?: ButtonPosition
  position?: PanelPosition
  initialOpen?: boolean
  theme?: Theme
}

interface HistoryEntry {
  time: number
  type: 'values' | 'errors' | 'submit' | 'reset' | 'validate'
  label: string
  detail?: string
  snapshot?: unknown
}

const LS_PREFIX = 'hf-fdt:'
function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(LS_PREFIX + key); return v !== null ? (JSON.parse(v) as T) : fallback }
  catch { return fallback }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(val)) } catch { /* noop */ }
}

const LOGO_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="3" stroke="#7ee787" stroke-width="2"/><line x1="7" y1="8" x2="17" y2="8" stroke="#7ee787" stroke-width="1.5" stroke-linecap="round"/><line x1="7" y1="12" x2="17" y2="12" stroke="#7ee787" stroke-width="1.5" stroke-linecap="round"/><line x1="7" y1="16" x2="12" y2="16" stroke="#7ee787" stroke-width="1.5" stroke-linecap="round"/></svg>`
const SEARCH_SVG = `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5"/><line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
const CLOSE_SVG = `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`

function escHtml(s: string): string {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function countErrors(errors: Record<string, unknown>): number {
  return Object.values(errors).filter(v => v !== null && v !== undefined && v !== '').length
}

function getAllFieldPaths(values: unknown, prefix = ''): string[] {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return prefix ? [prefix] : []
  const keys = Object.keys(values as Record<string, unknown>)
  if (keys.length === 0) return prefix ? [prefix] : []
  return keys.flatMap(k => {
    const path = prefix ? `${prefix}.${k}` : k
    const val = (values as Record<string, unknown>)[k]
    if (val && typeof val === 'object' && !Array.isArray(val)) return getAllFieldPaths(val, path)
    return [path]
  })
}

export class FormDevtools {
  private form: FormStoreApi<any, any, any>
  private label: string
  private host!: HTMLElement
  private shadow!: ShadowRoot
  private unsub?: () => void

  private isOpen: boolean
  private position: PanelPosition
  private buttonPosition: ButtonPosition
  private theme: Theme
  private panelSize: number
  private activeTab: 'overview' | 'fields' | 'values' | 'history' = 'overview'
  private fieldSearch = ''
  private selectedField: string | null = null
  private selectedHistoryIdx: number | null = null
  private history: HistoryEntry[] = []
  private prevValues: unknown = null
  private prevErrors: Record<string, unknown> = {}

  constructor(config: FormDevtoolsConfig) {
    this.form = config.form
    this.label = config.label ?? 'Form'
    this.isOpen         = lsGet('open', config.initialOpen ?? false)
    this.position       = lsGet('pos', config.position ?? 'bottom')
    this.buttonPosition = lsGet('btnpos', config.buttonPosition ?? 'bottom-right')
    this.theme          = lsGet('theme', config.theme ?? 'dark')
    this.panelSize      = lsGet('size', 360)
    this.mountPanel()
  }

  private mountPanel() {
    this.host = document.createElement('div')
    this.host.style.cssText = 'all:initial;position:fixed;z-index:99996;pointer-events:none;'
    this.shadow = this.host.attachShadow({ mode: 'open' })
    document.body.appendChild(this.host)

    const style = document.createElement('style')
    style.textContent = FORM_DEVTOOLS_CSS
    this.shadow.appendChild(style)

    this.prevValues = this.form.getValues()
    this.prevErrors = { ...this.form.getSnapshot().errors }

    this.render()

    this.unsub = this.form.subscribe(() => {
      this.trackChanges()
      this.scheduleRender()
    })
  }

  unmount() { this.unsub?.(); this.host.remove() }

  private trackChanges() {
    const snap = this.form.getSnapshot()
    const vals = this.form.getValues()

    // track value changes
    const valsJson = JSON.stringify(vals)
    if (valsJson !== JSON.stringify(this.prevValues)) {
      this.addHistory({ type: 'values', label: 'Values changed', snapshot: vals })
      this.prevValues = JSON.parse(valsJson)
    }

    // track error changes
    const errCount = countErrors(snap.errors)
    const prevErrCount = countErrors(this.prevErrors)
    if (errCount !== prevErrCount) {
      this.addHistory({ type: 'errors', label: `Errors: ${prevErrCount} → ${errCount}`, detail: `${errCount} error${errCount !== 1 ? 's' : ''}`, snapshot: snap.errors })
      this.prevErrors = { ...snap.errors }
    }
    if (snap.submitting && !this.prevErrors['__submitting__']) {
      this.addHistory({ type: 'submit', label: 'Form submitted' })
      ;(this.prevErrors as any)['__submitting__'] = true
    }
    if (!snap.submitting) delete (this.prevErrors as any)['__submitting__']
  }

  private addHistory(entry: Omit<HistoryEntry, 'time'>) {
    this.history.unshift({ ...entry, time: Date.now() })
    if (this.history.length > 50) this.history.pop()
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
    const errCount = countErrors(this.form.getSnapshot().errors)
    const badge = btn.querySelector<HTMLElement>('.badge')!
    badge.textContent = errCount > 0 ? String(errCount) : ''
    badge.classList.toggle('vis', errCount > 0)
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
    if (this.position === 'bottom') { s.height = `${sz}px`; s.left = '0'; s.right = '0'; s.top = 'auto'; s.width = 'auto'; s.bottom = '0' }
    if (this.position === 'top')    { s.height = `${sz}px`; s.left = '0'; s.right = '0'; s.bottom = 'auto'; s.width = 'auto'; s.top = '0' }
    if (this.position === 'left')   { s.width = `${sz}px`;  s.top = '0'; s.bottom = '0'; s.height = 'auto'; s.left = '0' }
    if (this.position === 'right')  { s.width = `${sz}px`;  s.top = '0'; s.bottom = '0'; s.height = 'auto'; s.right = '0' }
  }

  private wireResize(rh: HTMLElement, panel: HTMLElement) {
    let sY = 0, sX = 0, sz0 = 0
    const onMove = (e: MouseEvent) => {
      if (this.position === 'bottom') this.panelSize = Math.max(200, sz0 + (sY - e.clientY))
      if (this.position === 'top')    this.panelSize = Math.max(200, sz0 + (e.clientY - sY))
      if (this.position === 'left')   this.panelSize = Math.max(200, sz0 + (e.clientX - sX))
      if (this.position === 'right')  this.panelSize = Math.max(200, sz0 + (sX - e.clientX))
      lsSet('size', this.panelSize); this.applySizeToPanel(panel)
    }
    const onUp = () => { rh.classList.remove('drag'); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    rh.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault(); rh.classList.add('drag'); sY = e.clientY; sX = e.clientX; sz0 = this.panelSize
      document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
    })
  }

  private renderPanelHeader(panel: HTMLElement) {
    const ph = panel.querySelector<HTMLElement>('.ph')!
    const snap = this.form.getSnapshot()
    const errCount = countErrors(snap.errors)
    ph.innerHTML = `
      <div class="ph-logo">${LOGO_SVG}<span>Form Devtools</span></div>
      <div class="ph-form-name">${escHtml(this.label)}</div>
      <div class="ph-tabs">
        <button class="tab-btn ${this.activeTab === 'overview' ? 'on' : ''}" data-tab="overview">Overview</button>
        <button class="tab-btn ${this.activeTab === 'fields' ? 'on' : ''}" data-tab="fields">Fields</button>
        <button class="tab-btn ${this.activeTab === 'values' ? 'on' : ''}" data-tab="values">Values</button>
        <button class="tab-btn ${this.activeTab === 'history' ? 'on' : ''}" data-tab="history">
          History <span class="cnt">${this.history.length}</span>
        </button>
      </div>
      <div class="ph-right">
        ${errCount > 0 ? `<span style="font-size:11px;color:var(--err);font-weight:700;">${errCount} error${errCount !== 1 ? 's' : ''}</span>` : ''}
        <button class="ib" id="cb">${CLOSE_SVG}</button>
      </div>`
    ph.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach(b => b.addEventListener('click', () => { this.activeTab = b.dataset['tab'] as typeof this.activeTab; this.scheduleRender() }))
    ph.querySelector('#cb')?.addEventListener('click', () => { this.isOpen = false; lsSet('open', false); this.render() })
  }

  private renderPanelBody(panel: HTMLElement) {
    const body = panel.querySelector<HTMLElement>('.panel-body')!
    if (this.activeTab === 'overview') this.renderOverview(body)
    else if (this.activeTab === 'fields') this.renderFields(body)
    else if (this.activeTab === 'values') this.renderValues(body)
    else if (this.activeTab === 'history') this.renderHistory(body)
  }

  private renderOverview(container: HTMLElement) {
    const snap = this.form.getSnapshot()
    const vals = this.form.getValues()
    const errCount = countErrors(snap.errors)
    const touchedCount = Object.values(snap.touched).filter(Boolean).length
    const dirtyCount = Object.values(snap.dirty).filter(Boolean).length
    const allPaths = getAllFieldPaths(vals)
    const fieldCount = allPaths.length

    container.innerHTML = `
      <div class="ov">
        <div class="ov-section">
          <div class="stat-grid">
            <div class="stat-card ${errCount > 0 ? 'err-card' : 'ok-card'}">
              <div class="stat-card-val ${errCount > 0 ? 'err' : 'ok'}">${errCount}</div>
              <div class="stat-card-label">Errors</div>
            </div>
            <div class="stat-card ${touchedCount > 0 ? 'info-card' : ''}">
              <div class="stat-card-val info">${touchedCount}</div>
              <div class="stat-card-label">Touched</div>
            </div>
            <div class="stat-card ${dirtyCount > 0 ? 'warn-card' : ''}">
              <div class="stat-card-val warn">${dirtyCount}</div>
              <div class="stat-card-label">Dirty</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-val ok">${fieldCount}</div>
              <div class="stat-card-label">Fields</div>
            </div>
          </div>
        </div>
        <div class="ov-section"><div class="ov-section-title">Form status</div>
          <div class="info-g">
            <span class="info-l">Submitting</span><span class="info-v ${snap.submitting ? 'warn' : 'ok'}">${snap.submitting}</span>
            <span class="info-l">Validating</span><span class="info-v ${snap.validating ? 'warn' : 'ok'}">${snap.validating}</span>
            <span class="info-l">Initialized</span><span class="info-v ${snap.initialized ? 'ok' : ''}">${snap.initialized}</span>
            <span class="info-l">Form key</span><span class="info-v">${snap.formKey}</span>
          </div>
        </div>
        ${errCount > 0 ? `
        <div class="ov-section"><div class="ov-section-title">Errors (${errCount})</div>
          <div id="ov-errors"></div>
        </div>` : ''}
        <div class="ov-section"><div class="ov-section-title">Actions</div>
          <div class="ov-actions">
            <button class="ab" data-a="reset">Reset form</button>
            <button class="ab" data-a="clearErrors">Clear errors</button>
            <button class="ab" data-a="validate">Validate all</button>
          </div>
        </div>
      </div>`

    const errEl = container.querySelector<HTMLElement>('#ov-errors')
    if (errEl) renderExplorer(snap.errors, errEl)

    container.querySelectorAll<HTMLButtonElement>('[data-a]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const a = btn.dataset['a']
        if (a === 'reset')      this.form.reset()
        if (a === 'clearErrors') this.form.clearErrors()
        if (a === 'validate')   await this.form.validate()
        this.scheduleRender()
      })
    })
  }

  private renderFields(container: HTMLElement) {
    const snap = this.form.getSnapshot()
    const vals = this.form.getValues()
    const allPaths = getAllFieldPaths(vals)

    if (!container.querySelector('.fv')) {
      container.innerHTML = `
        <div class="fv">
          <div class="flt">
            <div class="flbar"><div class="sb">${SEARCH_SVG}<input placeholder="Filter fields…" class="f-search"/></div></div>
            <div class="fl f-list"></div>
          </div>
          <div class="fds f-detail"><div class="ns">← Select a field</div></div>
        </div>`

      const inp = container.querySelector<HTMLInputElement>('.f-search')!
      inp.value = this.fieldSearch
      inp.addEventListener('input', e => { this.fieldSearch = (e.target as HTMLInputElement).value; this.renderFieldList(container, allPaths, snap, vals) })
    }

    this.renderFieldList(container, allPaths, snap, vals)
  }

  private renderFieldList(container: HTMLElement, allPaths: string[], snap: ReturnType<FormStoreApi<any,any,any>['getSnapshot']>, vals: unknown) {
    const list = container.querySelector<HTMLElement>('.f-list')!
    const search = this.fieldSearch.toLowerCase()
    const paths = search ? allPaths.filter(p => p.toLowerCase().includes(search)) : allPaths

    if (paths.length === 0) {
      list.innerHTML = `<div class="empty">${search ? 'No matches' : 'No fields'}</div>`
    } else {
      list.innerHTML = paths.map(p => {
        const isTouched = snap.touched[p]
        const isDirty = snap.dirty[p]
        const hasErr = snap.errors[p] !== undefined && snap.errors[p] !== null && snap.errors[p] !== ''
        const sel = p === this.selectedField ? ' sel' : ''
        return `<div class="fr${sel}" data-path="${escHtml(p)}">
          <span class="fr-path" title="${escHtml(p)}">${escHtml(p)}</span>
          ${isTouched ? '<span class="fpill touched">T</span>' : ''}
          ${isDirty ? '<span class="fpill dirty">D</span>' : ''}
          ${hasErr ? '<span class="fpill errored">E</span>' : ''}
        </div>`
      }).join('')
      list.querySelectorAll<HTMLElement>('.fr').forEach(row => row.addEventListener('click', () => {
        this.selectedField = row.dataset['path'] ?? null; this.renderFieldList(container, allPaths, snap, vals); this.renderFieldDetail(container, snap, vals)
      }))
    }
    this.renderFieldDetail(container, snap, vals)
  }

  private renderFieldDetail(container: HTMLElement, snap: ReturnType<FormStoreApi<any,any,any>['getSnapshot']>, vals: unknown) {
    const detail = container.querySelector<HTMLElement>('.f-detail')!
    const path = this.selectedField
    if (!path) { detail.innerHTML = `<div class="ns">← Select a field</div>`; return }

    const isTouched = snap.touched[path] ?? false
    const isDirty = snap.dirty[path] ?? false
    const isValidating = snap.fieldValidating?.[path] ?? false
    const err = snap.errors[path]
    const hasErr = err !== undefined && err !== null && err !== ''

    // get value via path traversal
    let fieldVal: unknown = vals
    for (const seg of path.split('.')) {
      if (fieldVal && typeof fieldVal === 'object' && !Array.isArray(fieldVal)) {
        fieldVal = (fieldVal as Record<string, unknown>)[seg]
      } else { fieldVal = undefined; break }
    }

    detail.innerHTML = `
      <div class="fdh">
        <div class="fdk">${escHtml(path)}</div>
        <div class="fdm">
          ${isTouched ? '<span class="fpill touched">Touched</span>' : ''}
          ${isDirty ? '<span class="fpill dirty">Dirty</span>' : ''}
          ${hasErr ? '<span class="fpill errored">Error</span>' : '<span class="fpill valid">Valid</span>'}
          ${isValidating ? '<span class="fpill touched">Validating…</span>' : ''}
        </div>
      </div>
      <div class="fdb">
        <div class="sec"><div class="sec-t">Info</div>
          <div class="info-g">
            <span class="info-l">Touched</span><span class="info-v ${isTouched ? 'warn' : 'ok'}">${isTouched}</span>
            <span class="info-l">Dirty</span><span class="info-v ${isDirty ? 'warn' : 'ok'}">${isDirty}</span>
            <span class="info-l">Validating</span><span class="info-v ${isValidating ? 'warn' : 'ok'}">${isValidating}</span>
            <span class="info-l">Has error</span><span class="info-v ${hasErr ? 'err' : 'ok'}">${hasErr}</span>
          </div>
        </div>
        ${hasErr ? `<div class="sec"><div class="sec-t">Error</div><div id="fd-err"></div></div>` : ''}
        <div class="sec"><div class="sec-t">Value</div><div id="fd-val"></div></div>
      </div>`

    const valEl = detail.querySelector<HTMLElement>('#fd-val')
    if (valEl) renderExplorer(fieldVal, valEl)
    const errEl = detail.querySelector<HTMLElement>('#fd-err')
    if (errEl) renderExplorer(err, errEl)
  }

  private renderValues(container: HTMLElement) {
    const vals = this.form.getValues()
    container.innerHTML = `
      <div style="flex:1;padding:14px;overflow-y:auto;">
        <div style="margin-bottom:10px;display:flex;gap:8px;">
          <button class="ab" data-a="reset">Reset values</button>
          <button class="ab" data-a="copy">Copy JSON</button>
        </div>
        <div id="vals-exp"></div>
      </div>`
    const el = container.querySelector<HTMLElement>('#vals-exp')
    if (el) renderExplorer(vals, el)
    container.querySelector('[data-a="reset"]')?.addEventListener('click', () => { this.form.reset(); this.scheduleRender() })
    container.querySelector('[data-a="copy"]')?.addEventListener('click', () => {
      navigator.clipboard.writeText(JSON.stringify(vals, null, 2)).catch(() => {/* noop */})
    })
  }

  private renderHistory(container: HTMLElement) {
    if (!container.querySelector('.hv')) {
      container.innerHTML = `
        <div class="hv">
          <div class="hv-toolbar"><span class="hl">${this.history.length} events</span><button class="ab" id="hv-clear">Clear</button></div>
          <div class="hlist h-list"></div>
          <div style="flex:1;overflow-y:auto;padding:12px;border-left:1px solid var(--bg3);min-width:200px;" class="h-detail"><div class="ns">← Select event</div></div>
        </div>`
      container.querySelector('#hv-clear')?.addEventListener('click', () => { this.history = []; this.selectedHistoryIdx = null; this.renderHistory(container) })
    }

    const toolbar = container.querySelector<HTMLElement>('.hl')
    if (toolbar) toolbar.textContent = `${this.history.length} events`

    const list = container.querySelector<HTMLElement>('.h-list')!
    if (this.history.length === 0) {
      list.innerHTML = `<div class="empty">No events yet — interact with the form</div>`
    } else {
      const fmt = (ts: number) => new Date(ts).toLocaleTimeString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      list.innerHTML = this.history.map((e, i) => {
        const sel = i === this.selectedHistoryIdx ? ' sel' : ''
        return `<div class="he${sel}" data-i="${i}">
          <span class="he-time">${fmt(e.time)}</span>
          <span class="he-label"><strong>${escHtml(e.label)}</strong>${e.detail ? `<br/><span>${escHtml(e.detail)}</span>` : ''}</span>
          <span class="he-badge ${e.type}">${e.type}</span>
        </div>`
      }).join('')
      list.querySelectorAll<HTMLElement>('.he').forEach(row => row.addEventListener('click', () => {
        this.selectedHistoryIdx = Number(row.dataset['i']); this.renderHistory(container)
      }))
    }

    const detail = container.querySelector<HTMLElement>('.h-detail')!
    if (this.selectedHistoryIdx !== null && this.history[this.selectedHistoryIdx]) {
      const e = this.history[this.selectedHistoryIdx]!
      detail.innerHTML = `
        <div class="sec-t">${escHtml(e.label)}</div>
        <div class="info-g" style="margin-bottom:10px;">
          <span class="info-l">Time</span><span class="info-v">${new Date(e.time).toLocaleTimeString()}</span>
          <span class="info-l">Type</span><span class="info-v">${e.type}</span>
        </div>
        <div id="he-snap"></div>`
      const snapEl = detail.querySelector<HTMLElement>('#he-snap')
      if (snapEl && e.snapshot !== undefined) renderExplorer(e.snapshot, snapEl)
      else if (snapEl) snapEl.innerHTML = '<div class="empty">No snapshot</div>'
    } else {
      detail.innerHTML = `<div class="ns">← Select event</div>`
    }
  }

  private renderStatBar(panel: HTMLElement) {
    const stb = panel.querySelector<HTMLElement>('.stb')!
    const snap = this.form.getSnapshot()
    const errCount = countErrors(snap.errors)
    const touched = Object.values(snap.touched).filter(Boolean).length
    const dirty = Object.values(snap.dirty).filter(Boolean).length
    stb.innerHTML = `
      <div class="sti"><span class="stl">errors:</span><span class="stv ${errCount > 0 ? 'err' : 'ok'}">${errCount}</span></div>
      <div class="sti"><span class="stl">touched:</span><span class="stv">${touched}</span></div>
      <div class="sti"><span class="stl">dirty:</span><span class="stv ${dirty > 0 ? 'warn' : ''}">${dirty}</span></div>
      <div class="sti"><span class="stl">submitting:</span><span class="stv ${snap.submitting ? 'warn' : 'ok'}">${snap.submitting}</span></div>
      <div class="sti"><span class="stl">validating:</span><span class="stv ${snap.validating ? 'warn' : 'ok'}">${snap.validating}</span></div>`
  }

  private toggleOpen() { this.isOpen = !this.isOpen; lsSet('open', this.isOpen); this.render() }

  setForm(form: FormStoreApi<any, any, any>) { this.unsub?.(); this.form = form; this.unsub = form.subscribe(() => { this.trackChanges(); this.scheduleRender() }); this.scheduleRender() }
  setPosition(p: PanelPosition) { this.position = p; lsSet('pos', p); this.shadow.querySelector('.panel')?.remove(); this.scheduleRender() }
  setButtonPosition(p: ButtonPosition) { this.buttonPosition = p; lsSet('btnpos', p); this.scheduleRender() }
  setTheme(t: Theme) { this.theme = t; lsSet('theme', t); this.scheduleRender() }
}
