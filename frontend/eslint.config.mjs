import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

// Flat config (ESLint 9+). Gentle on day one: low-risk/style issues are "warn"
// (so `npm run lint` is not a broken gate), while real bugs stay as errors.
// `npm run lint` is opt-in developer tooling and is NOT part of build/deploy.

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.document, ...globals.es2021 },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      'react/react-in-jsx-scope': 'off',      // Vite + new JSX transform
      'react/prop-types': 'off',              // PropTypes not used here
      'react/jsx-uses-react': 'off',
      'react/jsx-uses-vars': 'warn',
      'react/no-unknown-property': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-console': 'off',
      'no-unused-vars': ['warn', { varsIgnorePattern: '^_', args: 'after-used', caughtErrors: 'none' }],
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'src/assets/**', '*.config.js', 'vite.config.*'],
  },
];
