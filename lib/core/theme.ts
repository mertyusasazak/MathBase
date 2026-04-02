/**
 * MathBase Design Tokens
 * Centralized theme for consistent aesthetics across all components.
 */

export const theme = {
  colors: {
    background: '#0a0a0c', // Deeper base background
    surface: '#16161a',    // Standard component background
    surfaceHover: '#1e1e24',
    surfaceActive: '#33333a',
    border: '#2a2a33',
    accent: '#c9a84c',     // MathBase Gold
    accentMuted: '#c9a84c22',
    accentDark: '#b8972f',
    text: '#e8e6df',       // Main text
    textMuted: '#7a7870',  // Metadata / secondary text
    textDim: '#b8b5ae',    // In-between text
    danger: '#c96b6b',
    dangerMuted: '#c96b6b22',
    success: '#7eb8b0',
    successMuted: '#7eb8b022',
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
