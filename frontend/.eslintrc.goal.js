module.exports = {
  extends: './.eslintrc',
  rules: {
    'import/no-restricted-paths': [
      'warn',
      {
        zones: [
          {
            target: ['./src/!(pages|__tests__|__mocks__)/**/*', './src/*'],
            from: './src/pages/**/*',
            message:
              'Modules from `src/pages` may not be imported by modules outside of `src/pages`.',
          },
          {
            target: './src/api/**/*',
            from: ['./src/!(utilities|api)/**/*'],
            message: 'Modules in `src/api` may only import external modules from `src/utilities`.',
          },
          {
            target: './src/components/**/*',
            from: ['./src/!(utilities|components|images)/**/*'],
            message:
              'Modules in `src/components` may only import external modules from `src/utilities``.',
          },
          {
            target: './src/utilities/**/*',
            from: ['./src/!(utilities)/**/*'],
            message: 'Modules in `src/utilities` may not import external modules',
          },
          {
            target: './src/typeHelpers.ts',
            from: './src/**/*',
            message: '`src/typeHelpers.ts` may not import external modules.',
          },
          {
            target: './src/types.ts',
            from: './src/**/*',
            message: '`src/types.ts` may not import external modules.',
          },
        ],
      },
    ],
  },
};
