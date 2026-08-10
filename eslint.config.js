import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

/**
 * Lint config.
 *
 * Deliberately narrow. Formatting rules are left out entirely — nothing here
 * argues about whitespace, because that is a job for a formatter and an
 * argument nobody needs. What is enabled is the set of rules that catch
 * things a human reviewer reliably misses: unused code, hook dependency
 * mistakes, and floating promises in an app that awaits audio unlocking all
 * over the place.
 */
export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'coverage', 'tools', 'prototype'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Unused code is the rule that pays for this whole file: it is how
      // three dead exports survived a dozen sessions unnoticed. Leading
      // underscores stay allowed, for deliberately ignored arguments.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],

      // `any` defeats the point of the strict tsconfig.
      '@typescript-eslint/no-explicit-any': 'error',

      // Non-null assertions are sometimes genuinely right (a lookup that
      // cannot miss), so this warns rather than fails.
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },
  {
    // Tests assert on things the app guarantees, so non-null assertions and
    // long files are normal there.
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
);
