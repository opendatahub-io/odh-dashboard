const path = require('path');
const { transformSync } = require('@babel/core');
const locatorPlugin = require('@locator/babel-jsx');

const REPOSITORY_ROOT = path.resolve(__dirname, '../..');

/**
 * Add LocatorJS path metadata to development JSX.
 *
 * Babel's cwd must be the monorepo root so sources outside frontend/ are stored as
 * repo-relative paths instead of accidentally being appended as absolute paths to
 * the frontend directory by Locator's runtime.
 *
 * @param {string} source
 */
module.exports = function locatorLoader(source) {
  const callback = this.async();
  const options = this.getOptions();
  const { resourcePath } = this;

  try {
    const result = transformSync(source, {
      filename: resourcePath,
      cwd: REPOSITORY_ROOT,
      sourceMaps: true,
      sourceFileName: resourcePath,
      babelrc: false,
      configFile: false,
      presets: [
        [
          '@babel/preset-typescript',
          {
            isTSX: true,
            allExtensions: true,
            onlyRemoveTypeImports: true,
          },
        ],
      ],
      plugins: [[locatorPlugin, { ...options, dataAttribute: 'path' }]],
    });

    callback(null, result?.code ?? source, result?.map ?? undefined);
  } catch (error) {
    callback(error);
  }
};
