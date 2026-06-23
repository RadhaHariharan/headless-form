export const FORM_DEVTOOLS_CSS = /*css*/`
  :host {
    --bg0: #0d1117; --bg1: #161b22; --bg2: #21262d; --bg3: #30363d;
    --fg0: #e6edf3; --fg1: #8b949e; --fg2: #6e7681;
    --accent: #7ee787; --accent2: #3fb950;
    --warn: #d29922; --err: #f85149; --ok: #3fb950; --info: #58a6ff;
    --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --mono: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
    font-family: var(--font); font-size: 13px; color: var(--fg0); line-height: 1.4; box-sizing: border-box;
  }
  :host([data-theme="light"]) {
    --bg0: #f6f8fa; --bg1: #ffffff; --bg2: #eaeef2; --bg3: #d0d7de;
    --fg0: #1f2328; --fg1: #57606a; --fg2: #8c959f;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── Toggle ─── */
  .toggle-btn {
    position: fixed; z-index: 99998; width: 48px; height: 48px; border-radius: 50%;
    background: var(--bg1); border: 1px solid var(--bg3);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,.4); transition: transform .15s; padding: 0;
  }
  .toggle-btn:hover { transform: scale(1.08); }
  .toggle-btn svg { width: 22px; height: 22px; }
  .toggle-btn .badge {
    position: absolute; top: -5px; right: -5px; background: var(--err); color: #fff;
    border-radius: 10px; font-size: 10px; font-weight: 700; padding: 1px 5px;
    min-width: 18px; text-align: center; border: 2px solid var(--bg0);
    display: none; font-family: var(--font);
  }
  .toggle-btn .badge.vis { display: block; }
  .toggle-btn.bottom-right { bottom: 16px; right: 72px; }
  .toggle-btn.bottom-left  { bottom: 16px; left:  72px; }
  .toggle-btn.top-right    { top: 16px;    right: 16px; }
  .toggle-btn.top-left     { top: 16px;    left:  16px; }

  /* ── Panel ─── */
  .panel { position: fixed; z-index: 99998; background: var(--bg0); border: 1px solid var(--bg3); display: flex; flex-direction: column; overflow: hidden; }
  .panel.hidden { display: none !important; }
  .panel.bottom { bottom: 0; left: 0; right: 0; border-bottom: none; border-radius: 8px 8px 0 0; }
  .panel.top    { top: 0;    left: 0; right: 0; border-top: none;    border-radius: 0 0 8px 8px; }
  .panel.left   { left: 0;  top: 0;  bottom: 0; border-left: none;  border-radius: 0 8px 8px 0; flex-direction: row; }
  .panel.right  { right: 0; top: 0;  bottom: 0; border-right: none; border-radius: 8px 0 0 8px; flex-direction: row-reverse; }

  /* ── Resize handle ─── */
  .rh { background: var(--bg3); flex-shrink: 0; transition: background .15s; }
  .rh:hover, .rh.drag { background: var(--accent); }
  .panel.bottom .rh, .panel.top .rh { height: 4px; cursor: ns-resize; width: 100%; }
  .panel.left   .rh, .panel.right .rh { width: 4px; cursor: ew-resize; }

  /* ── Panel inner ─── */
  .panel-inner { display: flex; flex-direction: column; flex: 1; overflow: hidden; min-width: 0; min-height: 0; }

  /* ── Header ─── */
  .ph {
    display: flex; align-items: center; gap: 6px; padding: 6px 10px;
    background: var(--bg1); border-bottom: 1px solid var(--bg3); flex-shrink: 0; min-width: 0;
  }
  .ph-logo { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
  .ph-logo svg { width: 16px; height: 16px; }
  .ph-logo span { font-weight: 700; font-size: 12px; color: var(--accent); white-space: nowrap; }
  .ph-form-name {
    font-size: 11px; color: var(--fg1); background: var(--bg2); border: 1px solid var(--bg3);
    border-radius: 4px; padding: 2px 7px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;
  }
  .ph-tabs { display: flex; gap: 2px; }
  .tab-btn {
    background: none; border: none; cursor: pointer; color: var(--fg1);
    font-size: 12px; font-weight: 500; padding: 3px 9px; border-radius: 5px;
    font-family: var(--font); transition: background .12s, color .12s;
  }
  .tab-btn:hover { background: var(--bg2); color: var(--fg0); }
  .tab-btn.on { background: var(--bg2); color: var(--fg0); }
  .tab-btn .cnt {
    background: var(--bg3); border-radius: 8px; font-size: 10px;
    padding: 0 5px; margin-left: 4px; color: var(--fg1);
  }
  .tab-btn .cnt.err { background: rgba(248,81,73,.2); color: var(--err); }
  .ph-right { margin-left: auto; display: flex; align-items: center; gap: 4px; }
  .ib {
    background: none; border: none; cursor: pointer; color: var(--fg1);
    padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center;
    transition: background .12s, color .12s;
  }
  .ib:hover { background: var(--bg2); color: var(--fg0); }
  .ib svg { width: 14px; height: 14px; }
  .ab {
    background: var(--bg2); border: 1px solid var(--bg3); color: var(--fg0);
    font-size: 11px; font-weight: 500; border-radius: 5px; padding: 4px 10px;
    cursor: pointer; font-family: var(--font); transition: all .12s;
  }
  .ab:hover { border-color: var(--accent); color: var(--accent); }
  .ab.danger:hover { border-color: var(--err); color: var(--err); }
  .ab.warn-btn:hover { border-color: var(--warn); color: var(--warn); }

  /* ── Body ─── */
  .panel-body { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }

  /* ── Status/Overview tab ─── */
  .ov { flex: 1; padding: 14px; overflow-y: auto; }
  .ov::-webkit-scrollbar { width: 5px; }
  .ov::-webkit-scrollbar-thumb { background: var(--bg3); border-radius: 3px; }

  .stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; margin-bottom: 16px; }
  .stat-card {
    background: var(--bg1); border: 1px solid var(--bg3); border-radius: 8px;
    padding: 12px 14px; display: flex; flex-direction: column; gap: 4px;
  }
  .stat-card.ok-card { border-color: rgba(63,185,80,.3); }
  .stat-card.err-card { border-color: rgba(248,81,73,.3); }
  .stat-card.warn-card { border-color: rgba(210,153,34,.3); }
  .stat-card.info-card { border-color: rgba(88,166,255,.3); }
  .stat-card-val { font-size: 22px; font-weight: 700; font-family: var(--mono); }
  .stat-card-val.ok  { color: var(--ok); }
  .stat-card-val.err { color: var(--err); }
  .stat-card-val.warn{ color: var(--warn); }
  .stat-card-val.info{ color: var(--info); }
  .stat-card-label { font-size: 11px; color: var(--fg1); font-weight: 500; }

  .ov-section { margin-bottom: 14px; }
  .ov-section-title { font-size: 10px; font-weight: 700; color: var(--fg1); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px; }
  .ov-actions { display: flex; gap: 6px; flex-wrap: wrap; }

  /* ── Fields tab ─── */
  .fv { display: flex; flex: 1; overflow: hidden; min-height: 0; }
  .flt {
    width: 260px; flex-shrink: 0; display: flex; flex-direction: column; border-right: 1px solid var(--bg3);
  }
  .panel.left .flt, .panel.right .flt { width: 100%; border-right: none; border-bottom: 1px solid var(--bg3); height: 45%; }
  .flbar {
    padding: 6px 8px; background: var(--bg1); border-bottom: 1px solid var(--bg3);
    display: flex; gap: 5px; flex-direction: column; flex-shrink: 0;
  }
  .sb { display: flex; align-items: center; gap: 4px; background: var(--bg0); border: 1px solid var(--bg3); border-radius: 5px; padding: 4px 8px; }
  .sb:focus-within { border-color: var(--accent); }
  .sb svg { width: 12px; height: 12px; color: var(--fg2); flex-shrink: 0; }
  .sb input { background: none; border: none; outline: none; color: var(--fg0); font-size: 12px; width: 100%; font-family: var(--font); }
  .sb input::placeholder { color: var(--fg2); }
  .fl { flex: 1; overflow-y: auto; }
  .fl::-webkit-scrollbar { width: 5px; }
  .fl::-webkit-scrollbar-thumb { background: var(--bg3); border-radius: 3px; }
  .fr {
    display: flex; align-items: center; gap: 5px; padding: 7px 10px;
    cursor: pointer; border-bottom: 1px solid var(--bg3); transition: background .1s; min-width: 0;
  }
  .fr:hover { background: var(--bg1); }
  .fr.sel { background: var(--bg2); }
  .fr-path { flex: 1; font-family: var(--mono); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .fpill {
    flex-shrink: 0; font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 8px;
    text-transform: uppercase; letter-spacing: .03em;
  }
  .fpill.touched  { background: rgba(88,166,255,.15); color: var(--info); }
  .fpill.dirty    { background: rgba(210,153,34,.15);  color: var(--warn); }
  .fpill.errored  { background: rgba(248,81,73,.15);   color: var(--err); }
  .fpill.valid    { background: rgba(63,185,80,.15);   color: var(--ok); }

  /* ── Field detail side ─── */
  .fds { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .fdh { padding: 8px 12px; background: var(--bg1); border-bottom: 1px solid var(--bg3); flex-shrink: 0; }
  .fdk { font-family: var(--mono); font-size: 11px; color: var(--fg0); margin-bottom: 6px; word-break: break-all; }
  .fdm { display: flex; flex-wrap: wrap; gap: 5px; }
  .fdb { flex: 1; overflow-y: auto; padding: 12px; }
  .fdb::-webkit-scrollbar { width: 5px; }
  .fdb::-webkit-scrollbar-thumb { background: var(--bg3); border-radius: 3px; }
  .sec { margin-bottom: 14px; }
  .sec-t { font-size: 10px; font-weight: 700; color: var(--fg1); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
  .info-g { display: grid; grid-template-columns: 100px 1fr; gap: 3px 8px; font-size: 12px; }
  .info-l { color: var(--fg1); }
  .info-v { color: var(--fg0); font-family: var(--mono); font-size: 11px; }
  .info-v.ok  { color: var(--ok); }
  .info-v.err { color: var(--err); }
  .info-v.warn{ color: var(--warn); }

  /* ── Explorer ─── */
  .exp {
    font-family: var(--mono); font-size: 12px; line-height: 1.7;
    background: var(--bg1); border: 1px solid var(--bg3); border-radius: 6px;
    padding: 8px 10px; overflow: auto;
  }
  .exp::-webkit-scrollbar { height: 4px; width: 5px; }
  .exp::-webkit-scrollbar-thumb { background: var(--bg3); border-radius: 2px; }
  .en { display: block; }
  .et { background: none; border: none; cursor: pointer; padding: 0; color: var(--fg1); font-family: var(--mono); font-size: 12px; line-height: 1.7; display: inline; }
  .et::before { content:'▶'; display:inline-block; width:12px; transition:transform .12s; color:var(--fg2); margin-right:2px; font-size:9px; }
  .et.open::before { transform: rotate(90deg); }
  .ec { margin-left: 16px; }
  .ek { color: #79c0ff; } .es { color: #a5d6ff; } .enum { color: #f0883e; }
  .eb { color: #d29922; } .enul { color: var(--fg2); } .ebk { color: var(--fg1); }
  .esum { color: var(--fg2); font-size: 11px; }

  /* ── History tab ─── */
  .hv { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .hv-toolbar { padding: 6px 10px; background: var(--bg1); border-bottom: 1px solid var(--bg3); display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .hv-toolbar .hl { flex: 1; font-size: 12px; color: var(--fg1); }
  .hlist { flex: 1; overflow-y: auto; padding: 4px 0; }
  .hlist::-webkit-scrollbar { width: 5px; }
  .hlist::-webkit-scrollbar-thumb { background: var(--bg3); border-radius: 3px; }
  .he {
    display: flex; align-items: flex-start; gap: 8px; padding: 7px 12px;
    border-bottom: 1px solid var(--bg3); cursor: pointer; transition: background .1s;
  }
  .he:hover { background: var(--bg1); }
  .he.sel { background: var(--bg2); }
  .he-time { font-size: 10px; color: var(--fg2); white-space: nowrap; font-family: var(--mono); flex-shrink: 0; padding-top: 2px; }
  .he-label { font-size: 12px; flex: 1; min-width: 0; }
  .he-label strong { color: var(--fg0); }
  .he-label span  { color: var(--fg1); font-family: var(--mono); font-size: 11px; }
  .he-badge { font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 8px; flex-shrink: 0; }
  .he-badge.values  { background: rgba(88,166,255,.15); color: var(--info); }
  .he-badge.errors  { background: rgba(248,81,73,.15);  color: var(--err); }
  .he-badge.submit  { background: rgba(126,231,135,.15);color: var(--accent); }
  .he-badge.reset   { background: rgba(210,153,34,.15); color: var(--warn); }
  .he-badge.validate{ background: rgba(63,185,80,.15);  color: var(--ok); }

  /* ── No selection ─── */
  .ns { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--fg2); font-size: 12px; text-align: center; padding: 24px; }
  .empty { padding: 24px; text-align: center; color: var(--fg2); font-size: 12px; }

  /* ── Status bar ─── */
  .stb {
    padding: 3px 12px; background: var(--bg1); border-top: 1px solid var(--bg3);
    display: flex; align-items: center; gap: 12px; flex-shrink: 0; flex-wrap: wrap;
  }
  .sti { display: flex; align-items: center; gap: 4px; font-size: 11px; }
  .stl { color: var(--fg2); }
  .stv { color: var(--fg0); font-weight: 600; }
  .stv.ok  { color: var(--ok); }
  .stv.err { color: var(--err); }
  .stv.warn{ color: var(--warn); }
`
