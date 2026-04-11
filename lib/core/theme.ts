/**
 * MathBase Design Tokens
 * Centralized theme for consistent aesthetics across all components.
 */

export const theme = {
  colors: {
    background: 'var(--bg)',
    surface: 'var(--surface)',
    surfaceHover: 'var(--surface-hover)',
    surfaceActive: 'var(--surface-active)',
    border: 'var(--border)',
    accent: 'var(--accent)',
    accentMuted: 'var(--accent-muted)',
    accentDark: 'var(--accent-dark)',
    onAccent: 'var(--on-accent)',
    text: 'var(--text)',
    textMuted: 'var(--text-muted)',
    textDim: 'var(--text-dim)',
    danger: 'var(--danger)',
    dangerMuted: 'var(--danger-muted)',
    success: 'var(--success)',
    successMuted: 'var(--success-muted)',
    source: 'var(--source)',
    sourceMuted: 'var(--source-muted)',
  },
  typography: {
    serif: 'EB Garamond, serif',
    sans: 'Instrument Sans, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
  animations: {
    fast: '0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '0.25s cubic-bezier(0.23, 1, 0.32, 1)',
  }
}
