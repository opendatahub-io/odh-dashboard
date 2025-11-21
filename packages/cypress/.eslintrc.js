module.exports = require('@odh-dashboard/eslint-config')
  .extend({
    extends: ['plugin:cypress/recommended'],
    rules: {
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
    overrides: [
      {
        files: ['cypress/**/*.ts'],
        rules: {
          // TODO turned off due to errors which needs to be addressed in the future
          '@typescript-eslint/consistent-type-assertions': 'off',

          '@typescript-eslint/consistent-type-imports': 'error',
          'no-restricted-syntax': [
            'error',
            {
              selector:
                "ImportDeclaration[importKind!='type'][source.value=/^@odh-dashboard\\u002F(?!internal\\u002F__mocks__)(?!internal\\u002Fapi\\u002Fmodels)(?!internal\\u002Fapi\\u002Fk8s)(?!app-config)(?!.*\\u002Fmocks)(?!.*(types|Types|__mocks__|__tests__|getCorePipelineSpec|utils|storageEnums|useStopModalPreference)).*$/]",
              message:
                "Must use 'import type' when importing from @odh-dashboard packages. If you are importing enums that are flagged, please go to the .eslintrc file and add it to the regular expression.",
            },

            // TODO tured off due to errors which needs to be addressed in the future
            // {
            //   selector:
            //     'Literal[value=/\\bRed Hat OpenShift AI\\b/i],JSXText[value=/\\bRed Hat OpenShift AI\\b/i]',
            //   message:
            //     "Do not hard code product name `Red Hat OpenShift AI`. Use `Cypress.env('ODH_PRODUCT_NAME')` instead.",
            // },
            // {
            //   selector: 'Literal[value=/\\bOpen Data Hub\\b/i],JSXText[value=/\\bOpen Data Hub\\b/i]',
            //   message:
            //     "Do not hard code product name `Open Data Hub`. Use `Cypress.env('ODH_PRODUCT_NAME')` instead.",
            // },
          ],
        },
      },
    ],
  })
  .recommendedTypescript(__dirname);
