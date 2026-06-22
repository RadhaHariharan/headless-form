'use strict';

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: true,
  },
  plugins: ['@typescript-eslint', 'import', 'unicorn', 'jsdoc'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:import/typescript',
    'plugin:jsdoc/recommended-typescript',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    'import/no-cycle': 'error',
    'import/no-default-export': 'error',
    'unicorn/filename-case': ['error', { case: 'kebabCase' }],
    'no-console': 'error',

    'jsdoc/require-jsdoc': [
      'error',
      {
        publicOnly: true,
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ClassDeclaration: true,
        },
        contexts: [
          'TSInterfaceDeclaration',
          'TSPropertySignature',
          'TSTypeAliasDeclaration',
          'TSEnumDeclaration',
          'TSEnumMember',
        ],
      },
    ],
    'jsdoc/require-param': 'error',
    'jsdoc/require-param-description': 'error',
    'jsdoc/require-returns': 'error',
    'jsdoc/require-returns-description': 'error',
    'jsdoc/check-param-names': 'error',
    'jsdoc/no-undefined-types': 'error',
  },
  overrides: [
    {
      files: ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx'],
      rules: {
        'jsdoc/require-jsdoc': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
    {
      files: ['*.config.ts', '*.config.cjs', '*.config.js'],
      rules: {
        'import/no-default-export': 'off',
        'jsdoc/require-jsdoc': 'off',
      },
    },
  ],
};
