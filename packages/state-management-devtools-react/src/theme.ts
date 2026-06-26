/** Shared color tokens for the devtools UI — a dark theme matching common devtools conventions. */
export const theme = {
  background: '#0f172a',
  panelBackground: '#111827',
  border: '#1e293b',
  borderStrong: '#334155',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  textFaint: '#64748b',
  accent: '#38bdf8',
  string: '#a5d6ff',
  number: '#f0b37e',
  boolean: '#f0b37e',
  nullish: '#64748b',
  key: '#9aa5b1',
  added: '#4ade80',
  removed: '#f87171',
  changedFrom: '#f87171',
  changedTo: '#4ade80',
  unchanged: '#64748b',
  buttonBackground: '#1e293b',
  buttonBackgroundActive: '#334155',
} as const;

/** Monospace font stack used throughout the devtools UI. */
export const monoFont = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
