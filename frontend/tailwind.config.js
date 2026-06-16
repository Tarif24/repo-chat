/** @type {import('tailwindcss').Config} */
module.exports = {
    // Class-based dark mode: Tailwind only applies `dark:` variants when an
    // ancestor element (we use <html>, managed by next-themes) has class="dark".
    darkMode: 'class',

    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],

    theme: {
        extend: {
            fontFamily: {
                // These map to the CSS variables set by next/font in fonts.ts and
                // applied to <html> in layout.tsx. Falls back to system fonts if
                // the variable isn't present for any reason.
                sans: [
                    'var(--font-sans)',
                    'ui-sans-serif',
                    'system-ui',
                    '-apple-system',
                    'sans-serif',
                ],
                mono: [
                    'var(--font-mono)',
                    'ui-monospace',
                    'SFMono-Regular',
                    'Menlo',
                    'monospace',
                ],
            },
        },
    },

    plugins: [],
};
