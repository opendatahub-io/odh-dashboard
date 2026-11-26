/** @jest-environment node */
const { OdhFederationPlugin } = require('@odh-dashboard/app-config/rspack');

jest.mock('@odh-dashboard/app-config/rspack', () => ({ OdhFederationPlugin: jest.fn() }));

describe('Model Serving extension build profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.replaceProperty(process, 'env', { ...process.env });
    delete process.env.MODEL_SERVING_EXTENSION_PROFILE;
  });
  afterEach(() => jest.restoreAllMocks());

  const loadConfig = () => {
    jest.isolateModules(() => {
      require('../../frontend/config/moduleFederation');
    });
  };

  it.each([undefined, 'full', 'deployments'])(
    'should select the %s profile before constructing the remote',
    (profile) => {
      if (profile !== undefined) process.env.MODEL_SERVING_EXTENSION_PROFILE = profile;
      loadConfig();
      expect(OdhFederationPlugin).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'modelServing',
          exposes: {
            './extensions':
              profile === 'deployments' ? '../extensions/deployments.ts' : './src/odh/extensions',
            './extension-points': './src/odh/extension-points',
          },
        }),
      );
    },
  );

  it.each(['', 'unknown', '../extensions/odh.ts', 'constructor', '__proto__'])(
    'should fail the build for unsupported profile %s',
    (profile) => {
      process.env.MODEL_SERVING_EXTENSION_PROFILE = profile;
      expect(loadConfig).toThrow('Unsupported MODEL_SERVING_EXTENSION_PROFILE');
      expect(OdhFederationPlugin).not.toHaveBeenCalled();
    },
  );
});
