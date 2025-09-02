module.exports = {
  env: {
    node: true,
    es6: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    js: true,
  },
  globals: {
    describe: 'readonly',
    test: 'readonly',
    expect: 'readonly',
    it: 'readonly',
    process: 'readonly',
    Set: 'readonly',
  },
  plugins: ['eslint-plugin-react-hooks', 'import', 'no-only-tests', 'no-relative-import-paths'],
  extends: ['eslint:recommended'],
  ignorePatterns: [
    '.nyc_output',
    'coverage',
    'jest-coverage',
    'public',
    'public-cypress',
    'node_modules',
    'dist',
    '@mf-types',
  ],
  rules: {
    'arrow-body-style': 'error',
    curly: 'error',
    'no-only-tests/no-only-tests': 'error',
    camelcase: 'warn',
    'no-else-return': ['error', { allowElseIf: false }],
    eqeqeq: ['error', 'always', { null: 'ignore' }],
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
    'import/no-extraneous-dependencies': 'off',
  },
  overrides: [
    {
      files: ['index.ts'],
      plugins: ['no-barrel-files'],
      rules: {
        'no-barrel-files/no-barrel-files': 'error',
      },
    },
  ],
};
