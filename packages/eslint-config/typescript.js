const { merge } = require('./utils');

const typescriptBaseNoRestrictedSyntax = [
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
];

const typescriptBase = {
  parser: '@typescript-eslint/parser',
  env: {
    browser: true,
  },
  // tell the TypeScript parser that we want to use JSX syntax
  parserOptions: {
    tsx: true,
    jsx: true,
    js: true,
    useJSXTextNode: true,
    project: true,
    // Defaults to CWD
    // tsconfigRootDir: __dirname,
  },
  // includes the typescript specific rules found here: https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/eslint-plugin#supported-rules
  plugins: ['@typescript-eslint'],
  extends: ['plugin:@typescript-eslint/recommended'],
  globals: {
    window: 'readonly',
    document: 'readonly',
  },
  settings: {
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
    '@typescript-eslint/no-non-null-assertion': 'error',
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
    '@typescript-eslint/no-base-to-string': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-empty-function': 'error',
    '@typescript-eslint/no-inferrable-types': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/no-unnecessary-condition': 'error',
    '@typescript-eslint/restrict-template-expressions': [
      'error',
      {
        allowNullish: false,
        allowArray: true,
      },
    ],
  },
};

module.exports = {
  overrides: [
    merge(typescriptBase, { files: ['*.ts', '*.tsx'] }),
    merge(typescriptBase, {
      files: ['*.ts', '*.tsx'],
      excludedFiles: ['**/__mocks__/**', '**/__tests__/**'],
      rules: {
        'no-restricted-syntax': ['error', ...typescriptBaseNoRestrictedSyntax],
        '@typescript-eslint/consistent-type-assertions': [
          'error',
          {
            assertionStyle: 'never',
          },
        ],
      },
    }),
    merge(typescriptBase, {
      files: [
        '**/extensions/**/*.ts',
        '**/extensions.ts',
        '**/extension-points/**/*.ts',
        '**/extension-points.ts',
      ],
      excludedFiles: ['**/extensions/index.ts', '**/extensions-points/index.ts'],
      rules: {
        '@typescript-eslint/consistent-type-imports': 'error',
        'no-restricted-syntax': [
          'error',
          ...typescriptBaseNoRestrictedSyntax,
          {
            selector: "ImportDeclaration[importKind!='type']",
            message:
              "Must use 'import type' when importing. Use dynamic imports for code references (eg. `() => import('#~/Test')`).",
          },
        ],
      },
    }),
  ],
};
