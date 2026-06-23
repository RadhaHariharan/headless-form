export const DEVTOOLS_CSS = /*css*/`
  :host {
    --bg0: #0d1117;
    --bg1: #161b22;
    --bg2: #21262d;
    --bg3: #30363d;
    --fg0: #e6edf3;
    --fg1: #8b949e;
    --fg2: #6e7681;
    --accent: #58a6ff;
    --fresh:    #3fb950;
    --fetching: #a5d6ff;
    --paused:   #d29922;
    --stale:    #f0883e;
    --inactive: #6e7681;
    --err:      #f85149;
    --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --mono: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
    font-family: var(--font);
    font-size: 13px;
    color: var(--fg0);
    line-height: 1.4;
    box-sizing: border-box;
  }
  :host([data-theme="light"]) {
    --bg0: #f6f8fa; --bg1: #ffffff; --bg2: #eaeef2; --bg3: #d0d7de;
    --fg0: #1f2328; --fg1: #57606a; --fg2: #8c959f;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── Toggle button ─────────────────────────────────────────────────────── */
  .toggle-btn {
    position: fixed; z-index: 99998;
    width: 48px; height: 48px; border-radius: 50%;
    background: var(--bg1); border: 1px solid var(--bg3);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,.4);
    transition: transform .15s, box-shadow .15s; padding: 0;
  }
  .toggle-btn:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(0,0,0,.5); }
  .toggle-btn svg { width: 24px; height: 24px; }
  .toggle-btn .badge {
    position: absolute; top: -5px; right: -5px;
    background: var(--accent); color: #fff; border-radius: 10px;
    font-size: 10px; font-weight: 700; padding: 1px 5px; min-width: 18px;
    text-align: center; border: 2px solid var(--bg0); display: none;
    font-family: var(--font);
  }
  .toggle-btn .badge.vis { display: block; }
  .toggle-btn.bottom-right { bottom: 16px; right: 16px; }
  .toggle-btn.bottom-left  { bottom: 16px; left:  16px; }
  .toggle-btn.top-right    { top: 16px;    right: 16px; }
  .toggle-btn.top-left     { top: 16px;    left:  16px; }

  /* ── Panel ─────────────────────────────────────────────────────────────── */
  .panel {
    position: fixed; z-index: 99999; background: var(--bg0);
    border: 1px solid var(--bg3); display: flex; flex-direction: column; overflow: hidden;
  }
  .panel.hidden { display: none !important; }
  .panel.bottom { bottom: 0; left: 0; right: 0; border-bottom: none; border-radius: 8px 8px 0 0; }
  .panel.top    { top: 0;    left: 0; right: 0; border-top: none;    border-radius: 0 0 8px 8px; }
  .panel.left   { left: 0;  top: 0;  bottom: 0; border-left: none;  border-radius: 0 8px 8px 0; flex-direction: row; }
  .panel.right  { right: 0; top: 0;  bottom: 0; border-right: none; border-radius: 8px 0 0 8px; flex-direction: row-reverse; }

  /* ── Resize handle ─────────────────────────────────────────────────────── */
  .rh {
    background: var(--bg3); flex-shrink: 0; transition: background .15s; z-index: 1;
  }
  .rh:hover, .rh.drag { background: var(--accent); }
  .panel.bottom .rh, .panel.top .rh { height: 4px; cursor: ns-resize; width: 100%; }
  .panel.left   .rh, .panel.right .rh { width: 4px; cursor: ew-resize; }

  /* ── Panel inner layout ────────────────────────────────────────────────── */
  .panel-inner { display: flex; flex-direction: column; flex: 1; overflow: hidden; min-width: 0; min-height: 0; }

  /* ── Panel header ──────────────────────────────────────────────────────── */
  .ph {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 10px; background: var(--bg1); border-bottom: 1px solid var(--bg3);
    flex-shrink: 0; min-width: 0;
  }
  .ph-logo { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
  .ph-logo svg { width: 16px; height: 16px; }
  .ph-logo span { font-weight: 700; font-size: 12px; color: var(--accent); white-space: nowrap; }
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
  .ph-right { margin-left: auto; display: flex; align-items: center; gap: 4px; }
  .online-pill {
    display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500;
    padding: 3px 8px; border-radius: 12px; cursor: pointer; border: 1px solid transparent;
    transition: all .15s; white-space: nowrap;
  }
  .online-pill.on  { background: rgba(63,185,80,.12);  color: var(--fresh); border-color: rgba(63,185,80,.3); }
  .online-pill.off { background: rgba(248,81,73,.12);   color: var(--err);   border-color: rgba(248,81,73,.3); }
  .online-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .ib {
    background: none; border: none; cursor: pointer; color: var(--fg1);
    padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center;
    transition: background .12s, color .12s;
  }
  .ib:hover { background: var(--bg2); color: var(--fg0); }
  .ib svg { width: 14px; height: 14px; }

  /* ── Queries view ──────────────────────────────────────────────────────── */
  .qv { display: flex; flex: 1; overflow: hidden; min-height: 0; }
  .panel.left .qv, .panel.right .qv { flex-direction: column; }

  /* List side */
  .ls {
    display: flex; flex-direction: column; border-right: 1px solid var(--bg3);
    flex-shrink: 0; overflow: hidden; width: 280px;
  }
  .panel.left .ls, .panel.right .ls {
    width: 100%; border-right: none; border-bottom: 1px solid var(--bg3); height: 45%;
  }
  .lt {
    padding: 6px 8px; background: var(--bg1); border-bottom: 1px solid var(--bg3);
    display: flex; flex-direction: column; gap: 5px; flex-shrink: 0;
  }
  .sb {
    display: flex; align-items: center; gap: 4px;
    background: var(--bg0); border: 1px solid var(--bg3); border-radius: 5px; padding: 4px 8px;
  }
  .sb:focus-within { border-color: var(--accent); }
  .sb svg { width: 12px; height: 12px; color: var(--fg2); flex-shrink: 0; }
  .sb input {
    background: none; border: none; outline: none; color: var(--fg0);
    font-size: 12px; width: 100%; font-family: var(--font);
  }
  .sb input::placeholder { color: var(--fg2); }
  .lc { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
  .fb {
    font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 10px;
    cursor: pointer; border: 1px solid transparent; transition: all .12s;
    white-space: nowrap; opacity: .55;
  }
  .fb:hover, .fb.on { opacity: 1; }
  .fb.on { box-shadow: 0 0 0 1px currentColor; }
  .fb.all     { background: var(--bg2); color: var(--fg0); border-color: var(--bg3); opacity: 1; }
  .fb.fresh   { background: rgba(63,185,80,.12);  color: var(--fresh);   border-color: rgba(63,185,80,.3); }
  .fb.fetching{ background: rgba(165,214,255,.12);color: var(--fetching);border-color: rgba(165,214,255,.3);}
  .fb.paused  { background: rgba(210,153,34,.12); color: var(--paused);  border-color: rgba(210,153,34,.3); }
  .fb.stale   { background: rgba(240,136,62,.12); color: var(--stale);   border-color: rgba(240,136,62,.3); }
  .fb.inactive{ background: rgba(110,118,129,.12);color: var(--inactive);border-color: rgba(110,118,129,.3);}
  .ss {
    background: var(--bg2); border: 1px solid var(--bg3); color: var(--fg0);
    font-size: 11px; border-radius: 4px; padding: 2px 5px; cursor: pointer;
    font-family: var(--font); outline: none; margin-left: auto;
  }
  .ql { flex: 1; overflow-y: auto; overflow-x: hidden; }
  .ql::-webkit-scrollbar { width: 5px; }
  .ql::-webkit-scrollbar-thumb { background: var(--bg3); border-radius: 3px; }
  .qr {
    display: flex; align-items: center; gap: 6px; padding: 7px 10px;
    cursor: pointer; border-bottom: 1px solid var(--bg3); transition: background .1s; min-width: 0;
  }
  .qr:hover { background: var(--bg1); }
  .qr.sel   { background: var(--bg2); }
  .sd {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  }
  .sd.fresh   { background: var(--fresh); }
  .sd.fetching{ background: var(--fetching); animation: pu 1s infinite; }
  .sd.paused  { background: var(--paused); }
  .sd.stale   { background: var(--stale); }
  .sd.inactive{ background: var(--inactive); }
  @keyframes pu { 0%,100%{opacity:1}50%{opacity:.35} }
  .qk {
    flex: 1; font-family: var(--mono); font-size: 11px; color: var(--fg0);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
  }
  .oc {
    flex-shrink: 0; font-size: 10px; font-weight: 700; color: var(--fg2);
    background: var(--bg2); border-radius: 4px; padding: 1px 5px;
  }
  .qa { flex-shrink: 0; font-size: 10px; color: var(--fg2); white-space: nowrap; }
  .empty { padding: 24px; text-align: center; color: var(--fg2); font-size: 12px; }

  /* Detail side */
  .ds { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
  .dh { padding: 8px 12px; background: var(--bg1); border-bottom: 1px solid var(--bg3); flex-shrink: 0; }
  .dk { font-family: var(--mono); font-size: 11px; color: var(--fg0); word-break: break-all; margin-bottom: 6px; }
  .dm { display: flex; flex-wrap: wrap; gap: 5px; }
  .mc {
    font-size: 11px; padding: 2px 7px; border-radius: 10px;
    display: flex; align-items: center; gap: 3px;
  }
  .mc.fresh   { background: rgba(63,185,80,.15);  color: var(--fresh); }
  .mc.fetching{ background: rgba(165,214,255,.15);color: var(--fetching); }
  .mc.paused  { background: rgba(210,153,34,.15); color: var(--paused); }
  .mc.stale   { background: rgba(240,136,62,.15); color: var(--stale); }
  .mc.inactive{ background: rgba(110,118,129,.15);color: var(--inactive); }
  .mc.error   { background: rgba(248,81,73,.15);  color: var(--err); }
  .mc.info    { background: var(--bg2); color: var(--fg1); }
  .da { padding: 6px 12px; border-bottom: 1px solid var(--bg3); display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; }
  .ab {
    background: var(--bg2); border: 1px solid var(--bg3); color: var(--fg0);
    font-size: 11px; font-weight: 500; border-radius: 5px; padding: 4px 10px;
    cursor: pointer; font-family: var(--font); transition: all .12s;
  }
  .ab:hover { border-color: var(--accent); color: var(--accent); }
  .ab.danger:hover { border-color: var(--err); color: var(--err); }
  .db { flex: 1; overflow-y: auto; padding: 12px; min-height: 0; }
  .db::-webkit-scrollbar { width: 5px; }
  .db::-webkit-scrollbar-thumb { background: var(--bg3); border-radius: 3px; }
  .sec { margin-bottom: 14px; }
  .sec-t { font-size: 10px; font-weight: 700; color: var(--fg1); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
  .info-g { display: grid; grid-template-columns: 120px 1fr; gap: 2px 8px; font-size: 12px; }
  .info-l { color: var(--fg1); }
  .info-v { color: var(--fg0); font-family: var(--mono); }
  .info-v.ok  { color: var(--fresh); }
  .info-v.err { color: var(--err); }
  .info-v.warn{ color: var(--paused); }

  /* ── JSON Tree Explorer ────────────────────────────────────────────────── */
  .exp {
    font-family: var(--mono); font-size: 12px; line-height: 1.7;
    background: var(--bg1); border: 1px solid var(--bg3); border-radius: 6px;
    padding: 8px 10px; overflow: auto;
  }
  .exp::-webkit-scrollbar { height: 4px; width: 5px; }
  .exp::-webkit-scrollbar-thumb { background: var(--bg3); border-radius: 2px; }
  .en { display: block; }
  .et {
    background: none; border: none; cursor: pointer; padding: 0;
    color: var(--fg1); font-family: var(--mono); font-size: 12px; line-height: 1.7; display: inline;
  }
  .et::before { content:'▶'; display:inline-block; width:12px; transition:transform .12s; color:var(--fg2); margin-right:2px; font-size:9px; }
  .et.open::before { transform: rotate(90deg); }
  .ec { margin-left: 16px; }
  .ek { color: #79c0ff; }
  .es { color: #a5d6ff; }
  .enum { color: #f0883e; }
  .eb { color: #d29922; }
  .enul { color: var(--fg2); }
  .ebk { color: var(--fg1); }
  .esum { color: var(--fg2); font-size: 11px; }

  /* ── Mutations view ────────────────────────────────────────────────────── */
  .mr {
    display: flex; align-items: center; gap: 6px; padding: 7px 10px;
    cursor: pointer; border-bottom: 1px solid var(--bg3); transition: background .1s; min-width: 0;
  }
  .mr:hover { background: var(--bg1); }
  .mr.sel { background: var(--bg2); }
  .md { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .md.idle    { background: var(--inactive); }
  .md.pending { background: var(--fetching); animation: pu 1s infinite; }
  .md.success { background: var(--fresh); }
  .md.error   { background: var(--err); }
  .mk { flex: 1; font-family: var(--mono); font-size: 11px; color: var(--fg0); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ms { font-size: 10px; font-weight: 600; color: var(--fg2); white-space: nowrap; }

  /* ── Settings ──────────────────────────────────────────────────────────── */
  .sv { flex: 1; padding: 16px; overflow-y: auto; }
  .sg { margin-bottom: 20px; }
  .sg-t { font-size: 11px; font-weight: 700; color: var(--fg1); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 10px; }
  .sr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 8px; }
  .sl { font-size: 12px; color: var(--fg0); }
  .rg { display: flex; gap: 4px; flex-wrap: wrap; }
  .rb {
    background: var(--bg2); border: 1px solid var(--bg3); color: var(--fg1);
    font-size: 11px; padding: 4px 10px; border-radius: 5px; cursor: pointer;
    font-family: var(--font); transition: all .12s;
  }
  .rb:hover { border-color: var(--accent); color: var(--fg0); }
  .rb.on { background: var(--accent); border-color: var(--accent); color: #fff; }

  /* ── Stat bar ──────────────────────────────────────────────────────────── */
  .stb {
    padding: 3px 12px; background: var(--bg1); border-top: 1px solid var(--bg3);
    display: flex; align-items: center; gap: 10px; flex-shrink: 0; flex-wrap: wrap;
  }
  .sti { display: flex; align-items: center; gap: 4px; font-size: 11px; }
  .std { width: 7px; height: 7px; border-radius: 50%; }
  .std.fresh   { background: var(--fresh); }
  .std.fetching{ background: var(--fetching); }
  .std.paused  { background: var(--paused); }
  .std.stale   { background: var(--stale); }
  .std.inactive{ background: var(--inactive); }
  .stc { color: var(--fg0); font-weight: 600; }
  .stl { color: var(--fg2); }

  /* ── No selection ──────────────────────────────────────────────────────── */
  .ns { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--fg2); font-size: 12px; text-align: center; padding: 24px; }
`
