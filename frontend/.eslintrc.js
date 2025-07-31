const fs = require('fs');
const path = require('path');

module.exports = {
  parser: '@typescript-eslint/parser',
  env: {
    browser: true,
    node: true,
  },
  // tell the TypeScript parser that we want to use JSX syntax
  parserOptions: {
    tsx: true,
    jsx: true,
    js: true,
    useJSXTextNode: true,
    project: true,
    tsconfigRootDir: __dirname,
  },
  // includes the typescript specific rules found here: https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/eslint-plugin#supported-rules
  plugins: [
    '@typescript-eslint',
    'react-hooks',
    'eslint-plugin-react-hooks',
    'import',
    'no-only-tests',
    'no-relative-import-paths',
    'prettier',
    'no-barrel-files',
  ],
  extends: [
    'eslint:recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'prettier',
  ],
  globals: {
    window: 'readonly',
    describe: 'readonly',
    test: 'readonly',
    expect: 'readonly',
    it: 'readonly',
    process: 'readonly',
    document: 'readonly',
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
        project: ['./tsconfig.json'],
      },
    },
  },
  rules: {
    'no-barrel-files/no-barrel-files': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    'jsx-a11y/no-autofocus': ['error', { ignoreNonDOM: true }],
    'jsx-a11y/anchor-is-valid': [
      'error',
      {
        components: ['Link'],
        specialLink: ['to'],
        aspects: ['noHref', 'invalidHref', 'preferButton'],
      },
    ],
    'react/jsx-boolean-value': 'error',
    'react/jsx-fragments': 'error',
    'react/jsx-no-constructed-context-values': 'error',
    'react/no-unused-prop-types': 'error',
    'arrow-body-style': 'error',
    curly: 'error',
    'no-only-tests/no-only-tests': 'error',
    '@typescript-eslint/default-param-last': 'error',
    '@typescript-eslint/dot-notation': ['error', { allowKeywords: true }],
    '@typescript-eslint/lines-between-class-members': [
      'error',
      'always',
      { exceptAfterSingleLine: false },
    ],
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
    camelcase: 'warn',
    'no-else-return': ['error', { allowElseIf: false }],
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'react/jsx-curly-brace-presence': [2, { props: 'never', children: 'never' }],
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '^axios$',
            importNames: ['default'],
            message: 'Import from `~/utilities/axios` instead.',
          },
        ],
        patterns: [
          {
            group: ['#~/api/**'],
            message: "Import from '#~/api' instead.",
          },
          {
            group: ['#~/components/table/**', '!~/components/table/useTableColumnSort'],
            message: "Import from '#~/components/table' instead.",
          },
          {
            group: ['#~/concepts/area/**'],
            message: "Import from '#~/concepts/area' instead.",
          },
          {
            group: ['#~/components/table/useTableColumnSort'],
            message:
              "The data will be sorted in the table, don't use this hook outside of '#~/components/table' repo. For more information, please check the props of the Table component.",
          },
          {
            group: ['#~/__mocks__/third_party/mlmd', '#~/__mocks__/third_party/mlmd/*'],
            message:
              "Importing from '#~/__mocks__/third_party/mlmd/' is restricted to '#~/__mocks__/mlmd/'.",
          },
          {
            group: ['@patternfly/react-core'],
            importNames: ['Select'],
            message:
              "Import 'SimpleSelect', 'MultiSelection' or 'TypeaheadSelect' from '#~/components' instead.",
          },
          {
            group: ['@patternfly/react-core'],
            importNames: ['NumberInput'],
            message: "Import 'NumberInputWrapper' from '#~/components' instead.",
          },
        ],
      },
    ],
    'object-shorthand': ['error', 'always'],
    'no-param-reassign': [
      'error',
      {
        props: true,
        ignorePropertyModificationsFor: ['acc', 'e'],
        ignorePropertyModificationsForRegex: ['^assignable[A-Z]'],
      },
    ],
    '@typescript-eslint/no-base-to-string': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-empty-function': 'error',
    '@typescript-eslint/no-inferrable-types': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    'react/self-closing-comp': 'error',
    '@typescript-eslint/no-unnecessary-condition': 'error',
    '@typescript-eslint/restrict-template-expressions': [
      'error',
      {
        allowNullish: false,
        allowArray: true,
      },
    ],
    'react-hooks/exhaustive-deps': 'error',
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
    'react-hooks/rules-of-hooks': 'error',
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    'import/order': [
      'error',
      {
        pathGroups: [
          {
            pattern: '#~/**',
            group: 'internal',
          },
          {
            pattern: '@mf/**',
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
    'no-restricted-properties': [
      'error',
      {
        object: 'Promise',
        property: 'allSettled',
        message: 'Avoid using Promise.allSettled, use allSettledPromises utility function instead.',
      },
      {
        property: 'sort',
        message: 'Avoid using .sort, use .toSorted instead.',
      },
    ],
    'import/newline-after-import': 'error',
    'import/no-duplicates': 'error',
    'import/no-named-as-default': 'error',
    'import/no-extraneous-dependencies': 'off',
    'no-relative-import-paths/no-relative-import-paths': [
      'warn',
      {
        allowSameFolder: true,
        rootDir: 'src',
        prefix: '~',
      },
    ],
    'prettier/prettier': [
      'error',
      {
        arrowParens: 'always',
        singleQuote: true,
        trailingComma: 'all',
        printWidth: 100,
      },
    ],
    'react/prop-types': 'off',
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
    'no-sequences': 'error',
    'no-undef-init': 'error',
    'no-unneeded-ternary': ['error', { defaultAssignment: false }],
    'no-useless-computed-key': 'error',
    'no-useless-return': 'error',
    'symbol-description': 'error',
    yoda: 'error',
    'func-names': 'warn',
  },
  overrides: [
    ...srcRulesOverrides(),
    {
      files: ['./src/api/**'],
      rules: {
        'no-restricted-imports': [
          'off',
          {
            patterns: ['#~/api/**'],
          },
        ],
      },
    },
    {
      files: ['./src/__tests__/cypress/**/*.ts'],
      parserOptions: {
        project: ['./src/__tests__/cypress/tsconfig.json'],
      },
      extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
        'prettier',
        'plugin:cypress/recommended',
      ],
      overrides: [
        {
          files: [
            './src/__tests__/cypress/cypress/pages/*.ts',
            './src/__tests__/cypress/cypress/tests/e2e/*.ts',
          ],
          rules: {
            'no-restricted-syntax': [
              'error',
              {
                selector: "CallExpression[callee.property.name='visit'][callee.object.name='cy']",
                message:
                  'Use `cy.visitWithLogin` in page objects and e2e tests instead of `cy.visit`.',
              },
            ],
          },
        },
      ],
    },
    {
      files: ['*.ts', '*.tsx'],
      excludedFiles: ['src/__mocks__/**', 'src/__tests__/**'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector:
              'Literal[value=/\\bRed Hat OpenShift AI\\b/i],JSXText[value=/\\bRed Hat OpenShift AI\\b/i]',
            message:
              'Do not hard code product name `Red Hat OpenShift AI`. Use `~/utilities/const#ODH_PRODUCT_NAME` instead.',
          },
          {
            selector: 'Literal[value=/\\bOpen Data Hub\\b/i],JSXText[value=/\\bOpen Data Hub\\b/i]',
            message:
              'Do not hard code product name `Open Data Hub`. Use `~/utilities/const#ODH_PRODUCT_NAME` instead.',
          },
          {
            selector:
              'JSXElement[openingElement.name.name=/Modal/]:has(> JSXOpeningElement:has(> [name.name=/(isOpen|open)/][value]))',
            message:
              "Do not control modals visibility with 'isOpen|open', use conditional rendering instead.",
          },
        ],
      },
    },
    {
      files: ['*.ts', '*.tsx'],
      excludedFiles: ['**/__mocks__/**', '**/__tests__/**'],
      rules: {
        '@typescript-eslint/consistent-type-assertions': [
          'error',
          {
            assertionStyle: 'never',
          },
        ],
      },
    },
    {
      files: ['src/__tests__/cypress/**'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector:
              'Literal[value=/\\bRed Hat OpenShift AI\\b/i],JSXText[value=/\\bRed Hat OpenShift AI\\b/i]',
            message:
              "Do not hard code product name `Red Hat OpenShift AI`. Use `Cypress.env('ODH_PRODUCT_NAME')` instead.",
          },
          {
            selector: 'Literal[value=/\\bOpen Data Hub\\b/i],JSXText[value=/\\bOpen Data Hub\\b/i]',
            message:
              "Do not hard code product name `Open Data Hub`. Use `Cypress.env('ODH_PRODUCT_NAME')` instead.",
          },
        ],
      },
    },
    {
      files: ['src/__mocks__/mlmd/**'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
    {
      files: ['src/__tests__/cypress/**'],
      rules: {
        '@typescript-eslint/consistent-type-imports': 'error',
        'no-restricted-syntax': [
          'error',
          {
            selector:
              "ImportDeclaration[importKind!='type'][source.value=/^~\\u002F(?!(__tests__|__mocks__|.*(types|Types|getCorePipelineSpec|utils)).*)/]",
            message:
              "Must use 'import type' when importing. If you are importing enums that are flagged, please go to the .eslintrc file and add it to the regular expression.",
          },
        ],
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
    {
      files: [
        'src/plugins/extensions/**',
        'packages/**/extensions.ts',
        'packages/**/extensions/**',
        'packages/**/extension-points/*.{ts,tsx,js,jsx}',
      ],
      excludedFiles: [
        'src/plugins/extensions/index.ts',
        'packages/**/extensions/index.ts',
        'packages/**/extensions-points/index.ts',
      ],
      rules: {
        '@typescript-eslint/consistent-type-imports': 'error',
        'no-restricted-syntax': [
          'error',
          {
            selector: "ImportDeclaration[importKind!='type']",
            message:
              "Must use 'import type' when importing. Use dynamic imports for code references (eg. `() => import('#~/Test')`).",
          },
        ],
      },
    },
    {
      files: ['**/*.yaml', '**/*.yml'],
      parser: 'yaml-eslint-parser',
      plugins: ['yml'],
      extends: ['plugin:yml/recommended'],
      rules: {
        '@typescript-eslint/consistent-type-imports': 'off',
        '@typescript-eslint/dot-notation': 'off',
        '@typescript-eslint/return-await': 'off',
        '@typescript-eslint/no-base-to-string': 'off',
        '@typescript-eslint/no-unnecessary-condition': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
        '@typescript-eslint/naming-convention': 'off',
      },
    },
    {
      files: ['**/*.md'],
      processor: 'markdown/markdown',
      plugins: ['markdown'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ],
};

function srcRulesOverrides() {
  const packagesDir = path.join(__dirname, 'packages');
  const packages = fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => `packages/${dirent.name}`);

  return [
    {
      files: ['src/**'],
      excludedFiles: ['src/__tests__/cypress/**'],
      rules: {
        'import/no-extraneous-dependencies': [
          'error',
          {
            packageDir: [__dirname, path.join(__dirname, 'src')],
          },
        ],
      },
    },
    // add monorepo packages
    ...packages.map((pkg) => ({
      files: [`${pkg}/**`],
      parserOptions: {
        tsconfigRootDir: path.join(__dirname, pkg),
      },
      rules: {
        'import/no-extraneous-dependencies': [
          'error',
          {
            packageDir: [__dirname, path.join(__dirname, pkg)],
          },
        ],
      },
    })),
  ];
}
