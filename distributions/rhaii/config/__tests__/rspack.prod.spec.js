/** @jest-environment node */
const rspackCommon = require('../rspack.common');

jest.mock('../rspack.common', () => jest.fn(({ mode }) => ({ mode })));
jest.mock('rspack-merge', () => ({ merge: (...configs) => Object.assign({}, ...configs) }));

const loadConfig = () => {
  let config;
  jest.isolateModules(() => {
    config = require('../rspack.prod');
  });
  return config;
};

describe('RHAII production assets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use content hashes for entry bundles, lazy chunks, and asset modules', () => {
    const config = loadConfig();
    expect(config.mode).toBe('production');
    expect(config.output).toEqual({
      filename: '[name].[contenthash].js',
      chunkFilename: '[name].[contenthash].js',
      assetModuleFilename: '[name].[contenthash][ext][query]',
    });
  });

  it('should configure shared asset loaders for production', () => {
    loadConfig();
    expect(jest.mocked(rspackCommon)).toHaveBeenCalledWith({ mode: 'production' });
  });
});
