import { Inter, IBM_Plex_Mono } from 'next/font/google';

// Named --font-sans-loaded / --font-mono-loaded (not --font-sans /
// --font-mono) on purpose — Tailwind v4 already reserves those exact names
// for its own font-sans / font-mono theme tokens. Using different names
// avoids a circular custom-property reference, then globals.css's @theme
// block wires these into Tailwind's tokens explicitly.

export const sans = Inter({
    subsets: ['latin'],
    variable: '--font-sans-loaded',
    display: 'swap',
});

export const mono = IBM_Plex_Mono({
    subsets: ['latin'],
    weight: ['400', '500', '600'],
    variable: '--font-mono-loaded',
    display: 'swap',
});
