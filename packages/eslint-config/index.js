const path = require('path');

const base = require('./base');
const react = require('./react');
const typescript = require('./typescript');
const markdown = require('./markdown');
const node = require('./node');
const yaml = require('./yaml');
const prettier = require('./prettier');

const { merge } = require('./utils');

const addNoExtraneousDependenciesRule = (config, dirname) => {
  const clone = structuredClone(config);
  clone.rules = {
    ...clone.rules,
    'import/no-extraneous-dependencies': [
      'error',
      {
        packageDir: [dirname, path.resolve(__dirname, '../../frontend')],
      },
    ],
  };
  clone.root = true;
  return clone;
};

// TODO: enable yaml once formatting is updated with prettier
const recommended = {
  recommendedCore: (dirname) =>
    addNoExtraneousDependenciesRule(
      {
        root: true,
        extends: [
          '@odh-dashboard/eslint-config/base',
          '@odh-dashboard/eslint-config/node',
          '@odh-dashboard/eslint-config/markdown',
          // '@odh-dashboard/eslint-config/yaml',
          '@odh-dashboard/eslint-config/prettier',
        ],
      },
      dirname,
    ),
  recommendedTypescript: (dirname) =>
    addNoExtraneousDependenciesRule(
      {
        root: true,
        extends: [
          '@odh-dashboard/eslint-config/base',
          '@odh-dashboard/eslint-config/node',
          '@odh-dashboard/eslint-config/typescript',
          '@odh-dashboard/eslint-config/markdown',
          // '@odh-dashboard/eslint-config/yaml',
          '@odh-dashboard/eslint-config/prettier',
        ],
      },
      dirname,
    ),
  recommendedReactTypescript: (dirname) =>
    addNoExtraneousDependenciesRule(
      {
        root: true,
        extends: [
          '@odh-dashboard/eslint-config/base',
          '@odh-dashboard/eslint-config/node',
          '@odh-dashboard/eslint-config/react',
          '@odh-dashboard/eslint-config/typescript',
          '@odh-dashboard/eslint-config/markdown',
          // '@odh-dashboard/eslint-config/yaml',
          '@odh-dashboard/eslint-config/prettier',
        ],
      },
      dirname,
    ),
};

const extend = (config) =>
  Object.keys(recommended).reduce((acc, key) => {
    acc[key] = (dirname) => merge(recommended[key](dirname), config);
    return acc;
  }, {});

module.exports = {
  ...recommended,
  extend,

  // core configs
  base,

  // add ons: include one or more
  react,
  typescript,
  markdown,
  node,
  yaml,

  // always include prettier
  prettier,

  // utils
  addNoExtraneousDependenciesRule,
};
