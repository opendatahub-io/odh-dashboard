const path = require('path');

const base = require('./base');
const react = require('./react');
const typescript = require('./typescript');
const reactTypescript = require('./react-typescript');

const merge = (a, b) => {
  const result = { ...a };

  for (const key in b) {
    if (Object.prototype.hasOwnProperty.call(b, key)) {
      if (key in result) {
        const aValue = result[key];
        const bValue = b[key];

        // If both are arrays, spread both
        if (Array.isArray(aValue) && Array.isArray(bValue)) {
          result[key] = [...aValue, ...bValue];
        }
        // If both are objects (and not arrays), spread both
        else if (
          typeof aValue === 'object' &&
          typeof bValue === 'object' &&
          aValue !== null &&
          bValue !== null &&
          !Array.isArray(aValue) &&
          !Array.isArray(bValue)
        ) {
          result[key] = { ...aValue, ...bValue };
        }
        // Otherwise, b's value overwrites a's value
        else {
          result[key] = bValue;
        }
      } else {
        result[key] = b[key];
      }
    }
  }

  return result;
};

const noExtraneousDependenciesOverrides = (dirname) => ({
  files: [`**/*.{js,jsx,ts,tsx}`],
  rules: {
    'import/no-extraneous-dependencies': [
      'error',
      {
        packageDir: [dirname, path.resolve(__dirname, '../../frontend')],
      },
    ],
  },
});

const addExtraneousDependencies = (config, dirname) => {
  const clone = structuredClone(config);
  clone.overrides = [...(clone.overrides || []), noExtraneousDependenciesOverrides(dirname)];
  clone.root = true;
  return clone;
};

const options = {
  reactTypescript: (dirname) => addExtraneousDependencies(reactTypescript, dirname),
  typescript: (dirname) => addExtraneousDependencies(typescript, dirname),
  react: (dirname) => addExtraneousDependencies(react, dirname),
  base: (dirname) => addExtraneousDependencies(base, dirname),
};

const extend = (config) =>
  Object.keys(options).reduce((acc, key) => {
    acc[key] = (dirname) => merge(options[key](dirname), config);
    return acc;
  }, {});

module.exports = { ...options, extend };
