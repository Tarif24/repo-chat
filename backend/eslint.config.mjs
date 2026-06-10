import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
    // ── Files to ignore ──────────────────────────────────────────────────────
    {
        ignores: [
            'dist/**',
            'build/**',
            'coverage/**',
            'node_modules/**',
            'repoCloning/**',
            '*.js', // compiled output at root level
        ],
    },

    // ── Base JS recommended rules ─────────────────────────────────────────────
    js.configs.recommended,

    // ── TypeScript recommended rules ──────────────────────────────────────────
    ...tseslint.configs.recommended,

    // ── Main config for all source + test files ───────────────────────────────
    {
        files: ['src/**/*.ts', 'tests/**/*.ts'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node, // process, __dirname, Buffer, etc.
            },
            parserOptions: {
                project: './tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // ── TypeScript ─────────────────────────────────────────────────────
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_', // allow _unused function params
                    varsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/explicit-function-return-type': 'off', // too noisy for Express handlers
            '@typescript-eslint/no-floating-promises': 'error', // catch unhandled async
            '@typescript-eslint/await-thenable': 'error',
            '@typescript-eslint/no-misused-promises': 'error',

            // ── General ────────────────────────────────────────────────────────
            'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
            'no-debugger': 'error',
            eqeqeq: ['error', 'always'], // require === not ==
            curly: 'error', // always use braces on if/else
            'no-var': 'error', // use const/let
            'prefer-const': 'error',
        },
    },

    // ── Looser rules for test files ───────────────────────────────────────────
    {
        files: ['tests/**/*.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off', // mocks often need any
            'no-console': 'off',
        },
    }
);
