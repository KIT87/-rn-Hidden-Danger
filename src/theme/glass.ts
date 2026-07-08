// Shared palette for the frosted-glass / purple-gradient theme.
// Used by screens that render over the app's ScreenGradient background.
export const GLASS = {
  cardBg: 'rgba(255,255,255,0.12)',
  cardBgStrong: 'rgba(255,255,255,0.18)',
  cardBorder: 'rgba(255,255,255,0.22)',
  divider: 'rgba(255,255,255,0.14)',
  chipBg: 'rgba(255,255,255,0.16)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.72)',
  textMuted: 'rgba(255,255,255,0.52)',
} as const;

// Top → bottom stops for the full-screen app background gradient.
export const SCREEN_GRADIENT = [
  { offset: 0, color: '#6f66f0' },
  { offset: 0.55, color: '#8b5cf6' },
  { offset: 1, color: '#9d4fd4' },
] as const;
