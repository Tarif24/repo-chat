import { Inter, IBM_Plex_Mono } from 'next/font/google';

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
    preload: false,
});
