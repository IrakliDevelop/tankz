import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // App + test source runs in the browser.
  {
    files: ['src/**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  // Architecture invariants — this is what makes AGENTS.md machine-enforced.
  // The simulation core must stay render-free and deterministic.
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['pixi.js', 'pixi.js/*'],
              message:
                'src/core must stay render-free — put Pixi/rendering in src/view.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'src/core must be DOM-free.' },
        { name: 'document', message: 'src/core must be DOM-free.' },
        {
          name: 'performance',
          message:
            'The sim must be deterministic — no wall-clock (performance.now).',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message:
            'The sim must be deterministic — thread a seeded PRNG through SimState, not Math.random.',
        },
        {
          object: 'Date',
          property: 'now',
          message:
            'The sim must be deterministic — no wall-clock. Drive time from SIM_DT.',
        },
        {
          object: 'performance',
          property: 'now',
          message:
            'The sim must be deterministic — no wall-clock. Drive time from SIM_DT.',
        },
      ],
    },
  },

  // Node-context files: tests and tooling configs.
  {
    files: ['**/*.test.ts', '*.config.{js,ts}', 'commitlint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },

  // Must be last: turn off formatting rules that would fight Prettier.
  prettier,
);
