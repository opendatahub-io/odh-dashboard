module.exports = {
  plugins: ['@odh-dashboard'],
  overrides: [
    {
      files: ['**/ContentModal.tsx'],
      rules: {
        '@odh-dashboard/no-restricted-imports': 'off',
      },
    },
  ],
  rules: {
    '@odh-dashboard/no-restricted-imports': [
      'warn',
      {
        patterns: [
          {
            group: ['@odh-dashboard/internal/pages/*', '!@odh-dashboard/internal/pages/projects'],
            message: 'Create reusable components or migrate old code from `frontend` to a package.',
          },
          {
            group: ['@patternfly/react-core'],
            importNames: [
              'Modal',
              'ModalBody',
              'ModalHeader',
              'ModalFooter',
              'ModalVariant',
              'ModalProps',
              'ModalHeaderProps',
              'ModalFooterProps',
              'ModalBodyProps',
            ],
            message:
              "Avoid using the PatternFly Modal directly. Use the project's ContentModal wrapper instead.",
          },
        ],
      },
    ],
  },
};
