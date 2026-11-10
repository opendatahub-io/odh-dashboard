/** @jest-environment node */
const rspackCommon = require('../rspack.common');

jest.mock('@rspack/core', () => ({
  rspack: {
    HtmlRspackPlugin: class {},
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
