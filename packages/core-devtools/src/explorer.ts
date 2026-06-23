/**
 * JSON tree explorer — renders any value as an expandable tree.
 * Self-contained, no dependencies.
 */

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderValue(val: unknown, depth: number, maxDepth = 6): string {
  if (val === null) return `<span class="enul">null</span>`
  if (val === undefined) return `<span class="enul">undefined</span>`
  if (typeof val === 'boolean') return `<span class="eb">${val}</span>`
  if (typeof val === 'number') return `<span class="enum">${val}</span>`
  if (typeof val === 'string') return `<span class="es">"${escHtml(val)}"</span>`
  if (typeof val === 'bigint') return `<span class="enum">${val}n</span>`
  if (val instanceof Date) return `<span class="es">"${val.toISOString()}"</span>`
  if (Array.isArray(val)) return renderArray(val, depth, maxDepth)
  if (typeof val === 'object') return renderObject(val as Record<string, unknown>, depth, maxDepth)
  return `<span class="enul">${escHtml(String(val))}</span>`
}

function renderArray(arr: unknown[], depth: number, maxDepth: number): string {
  if (arr.length === 0) return `<span class="ebk">[]</span>`
  if (depth >= maxDepth) return `<span class="esum">[Array(${arr.length})]</span>`

  const id = `exp-${Math.random().toString(36).slice(2)}`
  const preview = `[${arr.length}]`
  const items = arr.map((v, i) =>
    `<span class="en"><span class="ek">${i}</span><span class="ebk">: </span>${renderValue(v, depth + 1, maxDepth)}</span>`
  ).join('')

  return `<span class="en">
    <button class="et" data-target="${id}">${preview}</button>
    <span class="ebk">[</span>
    <span class="ec" id="${id}" style="display:none">${items}</span>
    <span class="ebk">]</span>
  </span>`
}

function renderObject(obj: Record<string, unknown>, depth: number, maxDepth: number): string {
  const keys = Object.keys(obj)
  if (keys.length === 0) return `<span class="ebk">{}</span>`
  if (depth >= maxDepth) return `<span class="esum">{${keys.length} keys}</span>`

  const id = `exp-${Math.random().toString(36).slice(2)}`
  const preview = `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', …' : ''}}`
  const items = keys.map(k =>
    `<span class="en"><span class="ek">"${escHtml(k)}"</span><span class="ebk">: </span>${renderValue(obj[k], depth + 1, maxDepth)}</span>`
  ).join('')

  return `<span class="en">
    <button class="et" data-target="${id}">${escHtml(preview)}</button>
    <span class="ebk">{</span>
    <span class="ec" id="${id}" style="display:none">${items}</span>
    <span class="ebk">}</span>
  </span>`
}

export function renderExplorer(val: unknown, root: HTMLElement): void {
  root.innerHTML = `<div class="exp">${renderValue(val, 0)}</div>`
  root.querySelectorAll<HTMLButtonElement>('.et').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset['target']
      if (!target) return
      const el = root.querySelector<HTMLElement>(`#${target}`)
      if (!el) return
      const open = el.style.display !== 'none'
      el.style.display = open ? 'none' : 'block'
      btn.classList.toggle('open', !open)
    })
  })
}

export function expandAll(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('.ec').forEach(el => { el.style.display = 'block' })
  root.querySelectorAll<HTMLButtonElement>('.et').forEach(btn => btn.classList.add('open'))
}
