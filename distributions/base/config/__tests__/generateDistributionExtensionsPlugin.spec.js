jest.mock('fs');
jest.mock('@rspack/core', () => {
  const VirtualModulesPlugin = jest.fn().mockImplementation(() => ({
    apply: jest.fn(),
  }));
  return {
    rspack: {
      experiments: {
        VirtualModulesPlugin,
      },
    },
  };
});

const fs = require('fs');
const { rspack } = require('@rspack/core');
const GenerateDistributionExtensionsPlugin = require('../generateDistributionExtensionsPlugin');

const { VirtualModulesPlugin } = rspack.experiments;

describe('GenerateDistributionExtensionsPlugin', () => {
  let plugin;

  beforeEach(() => {
    // Create a minimal instance without calling the constructor's full path
    plugin = Object.create(GenerateDistributionExtensionsPlugin.prototype);
    jest.clearAllMocks();
  });

  describe('validatePackageRef', () => {
    it('should throw when a package entry is missing a name', () => {
      expect(() => plugin.validatePackageRef({ extensionsPath: './extensions' })).toThrow(
        /missing required "name"/,
      );
    });

    it('should throw when a package name contains characters outside the allowed pattern', () => {
      expect(() =>
        plugin.validatePackageRef({ name: '@bad name!/pkg', extensionsPath: './extensions' }),
      ).toThrow(/Invalid name/);
    });

    it('should throw when a local extensionsPath attempts to escape the distribution directory', () => {
      expect(() =>
        plugin.validatePackageRef({
          name: 'my-local',
          extensionsPath: '../../etc/passwd',
          local: true,
        }),
      ).toThrow(/must resolve within the distribution directory/);
    });

    it('should throw when a local entry is missing extensionsPath', () => {
      expect(() =>
        plugin.validatePackageRef({
          name: 'my-local',
          local: true,
        }),
      ).toThrow(/missing required "extensionsPath"/);
    });

    it('should throw when a local extensionsPath is absolute', () => {
      expect(() =>
        plugin.validatePackageRef({
          name: 'my-local',
          extensionsPath: '/etc/passwd',
          local: true,
        }),
      ).toThrow(/must resolve within the distribution directory/);
    });

    it('should throw when a bundled extensionsPath does not match the package-path pattern', () => {
      expect(() =>
        plugin.validatePackageRef({
          name: '@odh-dashboard/pkg',
          extensionsPath: './../escape',
        }),
      ).toThrow(/Invalid extensionsPath/);
    });

    it('should accept a well-formed local extensionsPath nested within the distribution directory', () => {
      expect(() =>
        plugin.validatePackageRef({
          name: 'my-local',
          extensionsPath: './src/distribution-extensions',
          local: true,
        }),
      ).not.toThrow();
    });

    it('should accept a well-formed bundled extensionsPath', () => {
      expect(() =>
        plugin.validatePackageRef({
          name: '@odh-dashboard/pkg',
          extensionsPath: './extensions/portal',
        }),
      ).not.toThrow();
    });
  });

  describe('resolvePackages', () => {
    it('should emit bundled entries before local entries', () => {
      const config = {
        packages: {
          bundled: [{ package: '@odh-dashboard/gen-ai', extensionsPath: './extensions' }],
          local: [{ name: 'my-local', extensionsPath: './extensions' }],
        },
      };

      const result = plugin.resolvePackages(config, {});
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('@odh-dashboard/gen-ai');
      expect(result[0].local).toBe(false);
      expect(result[1].name).toBe('my-local');
      expect(result[1].local).toBe(true);
    });

    it('should accept bundled packages declared as bare package-name strings', () => {
      const config = {
        packages: {
          bundled: ['@odh-dashboard/gen-ai'],
        },
      };

      const result = plugin.resolvePackages(config, {});
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: '@odh-dashboard/gen-ai',
        extensionsPath: './extensions',
        local: false,
      });
    });

    it('should emit env-injected entries after both bundled and local', () => {
      const originalEnv = process.env.ENABLE_TEST;
      process.env.ENABLE_TEST = 'true';

      try {
        const config = {
          packages: {
            bundled: [{ package: '@odh-dashboard/gen-ai', extensionsPath: './extensions' }],
            local: [{ name: 'my-local', extensionsPath: './extensions' }],
          },
        };

        const envOverrides = {
          ENABLE_TEST: {
            package: '@odh-dashboard/test-pkg',
            extensionsPath: './extensions',
          },
        };

        const result = plugin.resolvePackages(config, envOverrides);
        expect(result).toHaveLength(3);
        expect(result[0].name).toBe('@odh-dashboard/gen-ai');
        expect(result[1].name).toBe('my-local');
        expect(result[2].name).toBe('@odh-dashboard/test-pkg');
      } finally {
        if (originalEnv === undefined) {
          delete process.env.ENABLE_TEST;
        } else {
          process.env.ENABLE_TEST = originalEnv;
        }
      }
    });

    it('should omit env-injected packages when the env var is not true', () => {
      const originalEnv = process.env.ENABLE_TEST;
      delete process.env.ENABLE_TEST;

      try {
        const config = {
          packages: {
            bundled: [{ package: '@odh-dashboard/gen-ai', extensionsPath: './extensions' }],
          },
        };

        const envOverrides = {
          ENABLE_TEST: {
            package: '@odh-dashboard/test-pkg',
            extensionsPath: './extensions',
          },
        };

        const result = plugin.resolvePackages(config, envOverrides);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('@odh-dashboard/gen-ai');
      } finally {
        if (originalEnv === undefined) {
          delete process.env.ENABLE_TEST;
        } else {
          process.env.ENABLE_TEST = originalEnv;
        }
      }
    });

    it('should place env-injected package after local when env reuses a bundled name', () => {
      const originalEnv = process.env.ENABLE_TEST;
      process.env.ENABLE_TEST = 'true';

      try {
        const config = {
          packages: {
            bundled: [
              {
                package: '@odh-dashboard/shared',
                extensionsPath: './extensions/bundled',
              },
            ],
            local: [{ name: 'my-local', extensionsPath: './extensions' }],
          },
        };

        const envOverrides = {
          ENABLE_TEST: {
            package: '@odh-dashboard/shared',
            extensionsPath: './extensions/env',
          },
        };

        const result = plugin.resolvePackages(config, envOverrides);
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('my-local');
        expect(result[1].name).toBe('@odh-dashboard/shared');
        expect(result[1].extensionsPath).toBe('./extensions/env');
      } finally {
        if (originalEnv === undefined) {
          delete process.env.ENABLE_TEST;
        } else {
          process.env.ENABLE_TEST = originalEnv;
        }
      }
    });

    it('should deduplicate by name with last occurrence winning', () => {
      const config = {
        packages: {
          bundled: [
            {
              package: '@odh-dashboard/shared',
              extensionsPath: './extensions/v1',
            },
          ],
          local: [{ name: '@odh-dashboard/shared', extensionsPath: './extensions/v2' }],
        },
      };

      const result = plugin.resolvePackages(config, {});
      expect(result).toHaveLength(1);
      expect(result[0].extensionsPath).toBe('./extensions/v2');
      expect(result[0].local).toBe(true);
    });

    it('should propagate a validation error for a local package attempting path traversal', () => {
      const config = {
        packages: {
          local: [{ name: 'evil', extensionsPath: '../../../etc/passwd' }],
        },
      };

      expect(() => plugin.resolvePackages(config, {})).toThrow(
        /must resolve within the distribution directory/,
      );
    });

    it('should propagate a validation error for a local package missing extensionsPath', () => {
      const config = {
        packages: {
          local: [{ name: 'incomplete' }],
        },
      };

      expect(() => plugin.resolvePackages(config, {})).toThrow(/missing required "extensionsPath"/);
    });

    it('should propagate a validation error for a bundled package missing a name', () => {
      const config = {
        packages: {
          bundled: [{ extensionsPath: './extensions' }],
        },
      };

      expect(() => plugin.resolvePackages(config, {})).toThrow(/missing required "name"/);
    });
  });

  describe('generateFileContent', () => {
    it('should generate import statements in the same order as packages', () => {
      const packages = [
        { name: '@odh-dashboard/gen-ai', extensionsPath: './extensions', local: false },
        { name: 'my-local', extensionsPath: './my-ext', local: true },
      ];

      const content = plugin.generateFileContent(packages, {});
      const lines = content.split('\n');

      const importLines = lines.filter((l) => l.startsWith('import extensions'));
      expect(importLines[0]).toContain('@odh-dashboard/gen-ai/extensions');
      expect(importLines[1]).toContain('./my-ext');

      const entryLines = lines.filter((l) => l.includes(': extensions'));
      expect(entryLines[0]).toContain('@odh-dashboard/gen-ai');
      expect(entryLines[1]).toContain('my-local');
    });

    it('should generate an empty pluginExtensions module when no packages are configured', () => {
      const content = plugin.generateFileContent([], {});

      expect(content).toContain('const pluginExtensions: Record<string, Extension[]> = {};');
      expect(content).not.toContain('import extensions');
    });

    it('should still emit configured feature flags when there are no packages', () => {
      const content = plugin.generateFileContent([], { someFlag: true });

      expect(content).toContain('"someFlag":true');
    });

    it('should merge feature flags from packages into the generated module', () => {
      const packages = [
        {
          name: '@odh-dashboard/gen-ai',
          extensionsPath: './extensions',
          local: false,
          featureFlags: { chatPlayground: true },
        },
      ];

      const content = plugin.generateFileContent(packages, { modelAsService: true });

      expect(content).toContain('"modelAsService":true');
      expect(content).toContain('"chatPlayground":true');
    });
  });

  describe('readConfig', () => {
    it('should parse YAML from the given config path', () => {
      fs.readFileSync.mockReturnValue(`
name: maas-customer-portal
packages:
  bundled:
    - package: '@odh-dashboard/maas'
`);

      const config = plugin.readConfig('/fake/distribution.yaml');

      expect(fs.readFileSync).toHaveBeenCalledWith('/fake/distribution.yaml', 'utf8');
      expect(config.name).toBe('maas-customer-portal');
      expect(config.packages.bundled).toEqual([{ package: '@odh-dashboard/maas' }]);
    });

    it('should throw when the YAML file is empty', () => {
      fs.readFileSync.mockReturnValue('');

      expect(() => plugin.readConfig('/fake/distribution.yaml')).toThrow(
        /empty or not a valid YAML object/,
      );
    });

    it('should throw when the YAML root is not an object', () => {
      fs.readFileSync.mockReturnValue('just-a-string');

      expect(() => plugin.readConfig('/fake/distribution.yaml')).toThrow(
        /empty or not a valid YAML object/,
      );
    });
  });

  describe('constructor', () => {
    let logSpy;

    beforeEach(() => {
      logSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      logSpy.mockRestore();
    });

    it('should read config and resolve packages', () => {
      fs.readFileSync.mockReturnValue(`
name: test-dist
featureFlags:
  modelAsService: true
packages:
  bundled:
    - package: '@odh-dashboard/gen-ai'
      extensionsPath: './extensions'
  local:
    - name: my-local
      extensionsPath: './extensions'
`);

      const instance = new GenerateDistributionExtensionsPlugin({
        configPath: '/fake/distribution.yaml',
        targetFile: 'src/distribution-extensions.ts',
      });

      expect(fs.readFileSync).toHaveBeenCalledWith('/fake/distribution.yaml', 'utf8');
      expect(VirtualModulesPlugin).not.toHaveBeenCalled();
      expect(instance.packages).toEqual([
        {
          name: '@odh-dashboard/gen-ai',
          extensionsPath: './extensions',
          featureFlags: undefined,
          local: false,
        },
        {
          name: 'my-local',
          extensionsPath: './extensions',
          featureFlags: undefined,
          local: true,
        },
      ]);
      expect(instance.configFeatureFlags).toEqual({ modelAsService: true });
      expect(logSpy).toHaveBeenCalledWith('Distribution extensions:', [
        '@odh-dashboard/gen-ai',
        'my-local (local)',
      ]);
      expect(instance.targetFile).toBe('src/distribution-extensions.ts');
    });

    it('should include env-injected packages when the env var is true', () => {
      const originalEnv = process.env.ENABLE_TEST;
      process.env.ENABLE_TEST = 'true';

      try {
        fs.readFileSync.mockReturnValue(`
name: test-dist
packages:
  bundled:
    - package: '@odh-dashboard/gen-ai'
`);

        const instance = new GenerateDistributionExtensionsPlugin({
          configPath: '/fake/distribution.yaml',
          targetFile: 'src/distribution-extensions.ts',
          envOverrides: {
            ENABLE_TEST: {
              package: '@odh-dashboard/test-pkg',
              extensionsPath: './extensions',
            },
          },
        });

        expect(instance.packages.map((p) => p.name)).toEqual([
          '@odh-dashboard/gen-ai',
          '@odh-dashboard/test-pkg',
        ]);
        expect(logSpy).toHaveBeenCalledWith('Distribution extensions:', [
          '@odh-dashboard/gen-ai',
          '@odh-dashboard/test-pkg',
        ]);
      } finally {
        if (originalEnv === undefined) {
          delete process.env.ENABLE_TEST;
        } else {
          process.env.ENABLE_TEST = originalEnv;
        }
      }
    });

    it('should log (none) when no packages are configured', () => {
      fs.readFileSync.mockReturnValue(`
name: empty-dist
`);

      const instance = new GenerateDistributionExtensionsPlugin({
        configPath: '/fake/distribution.yaml',
        targetFile: 'src/distribution-extensions.ts',
      });

      expect(instance.packages).toEqual([]);
      expect(logSpy).toHaveBeenCalledWith('Distribution extensions:', '(none)');
    });
  });

  describe('apply', () => {
    let logSpy;

    beforeEach(() => {
      logSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      logSpy.mockRestore();
    });

    it('should create a virtual module with generated catalog content', () => {
      fs.readFileSync.mockReturnValue(`
name: test-dist
featureFlags:
  modelAsService: true
packages:
  bundled:
    - package: '@odh-dashboard/gen-ai'
      extensionsPath: './extensions'
  local:
    - name: my-local
      extensionsPath: './extensions'
`);

      const instance = new GenerateDistributionExtensionsPlugin({
        configPath: '/fake/distribution.yaml',
        targetFile: '/proj/src/distribution-extensions.ts',
      });
      const virtualApply = jest.fn();
      VirtualModulesPlugin.mockImplementation(() => ({ apply: virtualApply }));

      const compiler = { context: '/proj', name: 'fake-compiler' };
      instance.apply(compiler);

      expect(VirtualModulesPlugin).toHaveBeenCalledTimes(1);
      const [virtualModulesArg] = VirtualModulesPlugin.mock.calls[0];
      const generated = virtualModulesArg['src/distribution-extensions.ts'];
      expect(generated).toContain('import extensions0 from "@odh-dashboard/gen-ai/extensions"');
      expect(generated).toContain('import extensions1 from "./extensions"');
      expect(generated).toContain("'@odh-dashboard/gen-ai': extensions0");
      expect(generated).toContain("'my-local': extensions1");
      expect(generated).toContain('"modelAsService":true');
      expect(virtualApply).toHaveBeenCalledWith(compiler);
    });

    it('should include env-injected packages in the generated catalog', () => {
      const originalEnv = process.env.ENABLE_TEST;
      process.env.ENABLE_TEST = 'true';

      try {
        fs.readFileSync.mockReturnValue(`
name: test-dist
packages:
  bundled:
    - package: '@odh-dashboard/gen-ai'
`);

        const instance = new GenerateDistributionExtensionsPlugin({
          configPath: '/fake/distribution.yaml',
          targetFile: '/proj/src/distribution-extensions.ts',
          envOverrides: {
            ENABLE_TEST: {
              package: '@odh-dashboard/test-pkg',
              extensionsPath: './extensions',
            },
          },
        });
        VirtualModulesPlugin.mockImplementation(() => ({ apply: jest.fn() }));
        instance.apply({ context: '/proj' });

        const generated = VirtualModulesPlugin.mock.calls[0][0]['src/distribution-extensions.ts'];
        expect(generated).toContain('@odh-dashboard/gen-ai/extensions');
        expect(generated).toContain('@odh-dashboard/test-pkg/extensions');
      } finally {
        if (originalEnv === undefined) {
          delete process.env.ENABLE_TEST;
        } else {
          process.env.ENABLE_TEST = originalEnv;
        }
      }
    });

    it('should emit an empty catalog when no packages are configured', () => {
      fs.readFileSync.mockReturnValue(`
name: empty-dist
`);

      const instance = new GenerateDistributionExtensionsPlugin({
        configPath: '/fake/distribution.yaml',
        targetFile: '/proj/src/distribution-extensions.ts',
      });
      VirtualModulesPlugin.mockImplementation(() => ({ apply: jest.fn() }));
      instance.apply({ context: '/proj' });

      const generated = VirtualModulesPlugin.mock.calls[0][0]['src/distribution-extensions.ts'];
      expect(generated).toContain('const pluginExtensions: Record<string, Extension[]> = {};');
    });
  });
});
