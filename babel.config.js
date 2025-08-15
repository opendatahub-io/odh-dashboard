module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        useBuiltIns: 'usage',
        corejs: '3',
        exclude: ['@babel/plugin-transform-dynamic-import'],
      },
    ],
    '@babel/preset-react',
    '@babel/preset-typescript',
  ],
  plugins: [
    // Devs tend to write `import { someIcon } from '@patternfly/react-icons';`
    // This transforms the import to be specific which prevents having to parse 2k+ icons
    // Also prevents potential bundle size blowups with CJS
    [
      'transform-imports',
      {
        '@patternfly/react-icons': {
          transform: (importName) =>
            `@patternfly/react-icons/dist/js/icons/${importName
              .split(/(?=[A-Z])/)
              .join('-')
              .toLowerCase()}`,
          preventFullImport: true,
        },
      },
    ],
  ],
};
