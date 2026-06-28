/**
 * Design tokens mirrored from `styles/globals.css` for use in JS/TS
 * (Framer Motion values, canvas drawing, inline styles). Keep in sync.
 */

export const colors = {
  cream: '#f4efe4',
  creamDeep: '#efe8da',
  ivory: '#fbf8f1',
  ivoryRaised: '#ffffff',
  wash: '#f0e9da',

  ink: '#2a2723',
  inkSoft: '#4a463f',
  muted: '#8c867a',
  faint: '#b6afa1',

  line: '#e6dfd0',
  lineStrong: '#d8cfbc',

  sage: '#7e8c6b',
  sageDeep: '#5f6e4f',
  forest: '#46553c',
  olive: '#8a8456',

  sand: '#cdae7c',
  amber: '#c79a52',
  sandWash: '#f2ead7',
  accentSoft: '#eef0e6',
} as const

export const radii = { sm: 12, md: 18, lg: 24, xl: 32 } as const

export const ease = {
  out: [0.22, 1, 0.36, 1] as [number, number, number, number],
  soft: [0.4, 0, 0.2, 1] as [number, number, number, number],
}

export const fonts = {
  serif: "'Fraunces', 'Iowan Old Style', Georgia, serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} as const
