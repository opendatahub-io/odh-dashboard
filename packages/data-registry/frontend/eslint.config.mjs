import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import noOnlyTestsPlugin from 'eslint-plugin-no-only-tests';
import noRelativeImportPathsPlugin from 'eslint-plugin-no-relative-import-paths';
import prettierPlugin from 'eslint-plugin-prettier';
import cypressPlugin from 'eslint-plugin-cypress/flat';
import markdown from '@eslint/markdown';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/*.yaml',
      '**/*.yml',
      'dist/**',
      'node_modules/**',
      'public-cypress/**',
      'coverage/**',
      'config/**',
      'package.json',
    ],
  },

  // Base config for all files
  js.configs.recommended,

  // TypeScript files
  ...tseslint.configs.recommended,

  // React configuration
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
      import: importPlugin,
      'no-only-tests': noOnlyTestsPlugin,
      'no-relative-import-paths': noRelativeImportPathsPlugin,
      prettier: prettierPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        it: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import/resolver': {
        typescript: {
          project: '.',
        },
      },
    },
    rules: {
      // JSX A11y rules
      'jsx-a11y/no-autofocus': ['error', { ignoreNonDOM: true }],
      'jsx-a11y/anchor-is-valid': [
        'error',
        {
          components: ['Link'],
          specialLink: ['to'],
          aspects: ['noHref', 'invalidHref', 'preferButton'],
        },
      ],

      // React rules
      'react/jsx-boolean-value': 'error',
      'react/jsx-fragments': 'error',
      'react/jsx-no-constructed-context-values': 'error',
      'react/no-unused-prop-types': 'error',
      'react/self-closing-comp': 'error',
      'react/jsx-curly-brace-presence': [2, { props: 'never', children: 'never' }],
      'react/prop-types': 'off',

      // React Hooks rules
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',

      // General rules
      'arrow-body-style': 'error',
      curly: 'error',
      'no-only-tests/no-only-tests': 'error',
      camelcase: 'warn',
      'no-else-return': ['error', { allowElseIf: false }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'object-shorthand': ['error', 'always'],
      'no-console': 'error',
      'no-param-reassign': [
        'error',
        {
          props: true,
          ignorePropertyModificationsFor: ['acc', 'e'],
          ignorePropertyModificationsForRegex: ['^assignable[A-Z]'],
        },
      ],
      'prefer-destructuring': [
        'error',
        {
          VariableDeclarator: {
            array: false,
            object: true,
          },
          AssignmentExpression: {
            array: true,
            object: false,
          },
        },
        {
          enforceForRenamedProperties: false,
        },
      ],
      'array-callback-return': ['error', { allowImplicit: true }],
      'prefer-template': 'error',
      'no-lone-blocks': 'error',
      'no-lonely-if': 'error',
      'no-promise-executor-return': 'error',
      'no-restricted-globals': [
        'error',
        {
          name: 'isFinite',
          message:
            'Use Number.isFinite instead https://github.com/airbnb/javascript#standard-library--isfinite',
        },
        {
          name: 'isNaN',
          message:
            'Use Number.isNaN instead https://github.com/airbnb/javascript#standard-library--isnan',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          property: 'sort',
          message: 'Avoid using .sort, use .toSorted instead.',
        },
      ],
      'no-sequences': 'error',
      'no-undef-init': 'error',
      'no-unneeded-ternary': ['error', { defaultAssignment: false }],
      'no-useless-computed-key': 'error',
      'no-useless-return': 'error',
      'symbol-description': 'error',
      yoda: 'error',
      'func-names': 'warn',

      // TypeScript rules
      '@typescript-eslint/default-param-last': 'error',
      '@typescript-eslint/dot-notation': ['error', { allowKeywords: true }],
      '@typescript-eslint/method-signature-style': 'error',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
      ],
      '@typescript-eslint/no-unused-expressions': [
        'error',
        {
          allowShortCircuit: false,
          allowTernary: false,
          allowTaggedTemplates: false,
        },
      ],
      '@typescript-eslint/no-redeclare': 'error',
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],
      '@typescript-eslint/no-base-to-string': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-empty-function': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',

      // Import rules
      'import/extensions': 'off',
      'import/no-unresolved': 'off',
      'import/order': [
        'error',
        {
          pathGroups: [
            {
              pattern: '~/**',
              group: 'external',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          groups: [
            'builtin',
            'external',
            'internal',
            'index',
            'sibling',
            'parent',
            'object',
            'unknown',
          ],
        },
      ],
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',
      'import/no-named-as-default': 'error',
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: true,
          optionalDependencies: true,
        },
      ],

      // No relative import paths
      'no-relative-import-paths/no-relative-import-paths': [
        'warn',
        {
          allowSameFolder: true,
          rootDir: 'src',
          prefix: '~',
        },
      ],

      // Prettier
      'prettier/prettier': [
        'error',
        {
          arrowParens: 'always',
          singleQuote: true,
          trailingComma: 'all',
          printWidth: 100,
        },
      ],
    },
  },

  // TypeScript files - no type assertions in production code
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['**/__mocks__/**', '**/__tests__/**'],
    rules: {
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        {
          assertionStyle: 'never',
        },
      ],
    },
  },

  // API files - allow certain imports
  {
    files: ['src/api/**'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },

  // Cypress test files
  {
    files: ['src/__tests__/cypress/**/*.ts'],
    ...cypressPlugin.configs.recommended,
    languageOptions: {
      ...cypressPlugin.configs.recommended.languageOptions,
      parserOptions: {
        ...cypressPlugin.configs.recommended.languageOptions?.parserOptions,
        project: './src/__tests__/cypress/tsconfig.json',
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@patternfly/**'],
              message:
                'Cypress tests should only import mocks and types from outside the Cypress test directory.',
            },
          ],
        },
      ],
    },
  },

  // Markdown files - use @eslint/markdown processor
  ...markdown.configs.processor,

  // Code blocks inside markdown - relaxed rules
  {
    files: ['**/*.md/*.js', '**/*.md/*.jsx', '**/*.md/*.ts', '**/*.md/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-unused-expressions': 'off',
      'no-console': 'off',
      'import/no-unresolved': 'off',
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'prettier/prettier': 'off',
    },
  },
);
