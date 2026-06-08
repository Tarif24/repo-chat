import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    globalSetup: './tests/globalSetup.ts',
    globalTeardown: './tests/globalTeardown.ts',
    setupFilesAfterEnv: ['./tests/setup.ts'],
    // ** means any folder depth, * means any filename
    testMatch: ['**/tests/unit/**/*.test.ts', '**/tests/integration/**/*.test.ts'],

    // These folders are never scanned for tests
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/tests/e2e/', // Playwright handles E2E — Jest does not touch this folder
    ],

    // When you run coverage reports, only count these files
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/index.ts', // entry point — covered by integration tests
        '!src/types/**/*.ts', // TypeScript type definitions — no logic to test
        '!src/models/**/*.ts', // Mongoose schema definitions — no logic to test
    ],

    coverageThreshold: {
        global: {
            branches: 60, // % of if/else branches tested
            functions: 70, // % of functions called in tests
            lines: 70, // % of lines executed in tests
            statements: 70, // % of statements executed
        },
    },
    testTimeout: 10000,
    verbose: true,
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.test.json' }],
    },
};

export default config;
