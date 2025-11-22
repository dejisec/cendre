// Flat ESLint config for the frontend (ESLint v9+)
// Uses TypeScript parser and React hooks / React Refresh plugins.

/** @type {import('eslint').Linter.FlatConfig[]} */

const tsParser = require('@typescript-eslint/parser');
const tsEslint = require('@typescript-eslint/eslint-plugin');
const reactHooks = require('eslint-plugin-react-hooks');
const reactRefresh = require('eslint-plugin-react-refresh');

module.exports = [
  {
    ignores: ['dist/', 'node_modules/', 'test-results/'],
  },
  {
    files: [
      'src/**/*.{ts,tsx}',
      'e2e/**/*.{ts,tsx}',
      'vite.config.*',
      'playwright.config.*',
      'tailwind.config.*',
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',

        // Vitest / test globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsEslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // TypeScript rules – keep things permissive for now
      '@typescript-eslint/no-explicit-any': 'off',

      // React rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
];


