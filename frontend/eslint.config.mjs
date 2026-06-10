import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginNext from '@next/eslint-plugin-next';
import globals from 'globals';

export default tseslint.config(
    // ── Files to ignore ──────────────────────────────────────────────────────
    {
        ignores: [
            '.next/**',
            'out/**',
            'node_modules/**',
            'next.config.js',
            'postcss.config.js',
            'tailwind.config.js',
        ],
    },

    // ── Base JS recommended rules ─────────────────────────────────────────────
    js.configs.recommended,

    // ── TypeScript recommended rules ──────────────────────────────────────────
    ...tseslint.configs.recommended,

    // ── Main config ───────────────────────────────────────────────────────────
    {
        files: ['src/**/*.{ts,tsx}'],
        plugins: {
            react: pluginReact,
            'react-hooks': pluginReactHooks,
            '@next/next': pluginNext,
        },
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node, // for Next.js API routes / server components
            },
            parserOptions: {
                project: './tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
                ecmaFeatures: { jsx: true },
            },
        },
        settings: {
            react: {
                version: 'detect', // auto-detect React version from package.json
            },
        },
        rules: {
            // ── Next.js ────────────────────────────────────────────────────────
            ...pluginNext.configs.recommended.rules,
            ...pluginNext.configs['core-web-vitals'].rules,

            // ── React ──────────────────────────────────────────────────────────
            ...pluginReact.configs.recommended.rules,
            'react/react-in-jsx-scope': 'off', // not needed in React 17+
            'react/prop-types': 'off', // TypeScript handles this
            'react/display-name': 'warn',

            // ── React Hooks ────────────────────────────────────────────────────
            ...pluginReactHooks.configs.recommended.rules,
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

            // ── TypeScript ─────────────────────────────────────────────────────
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',

            // ── General ────────────────────────────────────────────────────────
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            eqeqeq: ['error', 'always'],
            'prefer-const': 'error',
            'no-var': 'error',
        },
    }
);
