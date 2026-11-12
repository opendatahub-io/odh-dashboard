/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const { rspack } = require('@rspack/core');
const rspackCommon = require('../rspack.common');

jest.mock('@rspack/core', () => ({
  rspack: {
    HtmlRspackPlugin: class {
      constructor(options) {
        this.options = options;
      }
    },
    DefinePlugin: class {},
  },
}));

describe('shared asset loaders', () => {
  it.each([
    ['production', '[name].[contenthash].[ext]'],
    ['development', '[name].[ext]'],
    [undefined, '[name].[ext]'],
  ])('should use %s filename patterns for fonts and images', (mode, filename) => {
    const config = rspackCommon({ mode });
    expect(config.mode).toBe(mode || 'development');
    const { rules } = config.module;
    const fontRule = rules.find(({ use }) => use?.loader === 'file-loader');
    expect(fontRule.use.options).toEqual({ outputPath: 'fonts', name: filename });
    const imageRule = rules.find(
      ({ use }) => Array.isArray(use) && use.some(({ loader }) => loader === 'url-loader'),
    );
    expect(imageRule.use[0].options).toEqual({
      limit: 5000,
      outputPath: 'images',
      name: filename,
    });
  });
});

describe('page icon', () => {
  it.each(['production', 'development'])(
    'should emit the Red Hat AI favicon under the public path in %s',
    (mode) => {
      const config = rspackCommon({ mode, publicPath: '/maas-portal/' });
      const html = config.plugins.find((plugin) => plugin instanceof rspack.HtmlRspackPlugin);
      const favicon = path.resolve(__dirname, '../../src/images/red-hat-ai-favicon.svg');
      expect(html.options.favicon).toBe(favicon);
      expect(fs.existsSync(favicon)).toBe(true);
      // The plugin links the icon as output.publicPath + its file name.
      expect(config.output.publicPath).toBe('/maas-portal/');
    },
  );
});
