// eslint.config.ts
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  // Define ignores (replacing .eslintignore)
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '*.js'
    ]
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': tseslint,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // TypeScript-specific rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_',  }],
      
      // General rules
      'no-console': ['warn', { allow: ['error', 'warn', 'info'] }],
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-unused-expressions': 'error',
      'prefer-const': 'error',
    },
  },
  {
    files: ['**/tests/**/*.ts', '**/*.spec.ts', '**/*.test.ts'],
    rules: {
      // Less strict rules for test files
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  {
    // Config files can use CommonJS
    files: ['*.config.js', '*.config.ts', 'jest.config.js'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
];
