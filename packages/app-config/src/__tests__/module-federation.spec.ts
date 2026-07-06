import { execSync } from 'child_process';
import type { ModuleFederationConfig, ModuleFederationConfigOld, WorkspacePackage } from '../types';
import { getModuleFederationConfigs } from '../module-federation';

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('getModuleFederationConfigs', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
    delete process.env.MODULE_FEDERATION_CONFIG;
    delete process.env.OC_PROJECT;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('when MODULE_FEDERATION_CONFIG env var is not set', () => {
    it('should return empty array when fallbackToPackages is false (default)', () => {
      const result = getModuleFederationConfigs();
      expect(result).toEqual([]);
      expect(mockExecSync).not.toHaveBeenCalled();
    });

    it('should return empty array when fallbackToPackages is explicitly false', () => {
      const result = getModuleFederationConfigs(false);
      expect(result).toEqual([]);
      expect(mockExecSync).not.toHaveBeenCalled();
    });

    it('should query workspace packages when fallbackToPackages is true', () => {
      const workspacePackages: WorkspacePackage[] = [
        { name: 'package-without-mf' },
        {
          name: 'package-with-mf',
          'module-federation': {
            name: 'test-module',
            backend: {
              remoteEntry: '/api/test/remoteEntry.js',
              service: { name: 'test-service', namespace: 'test-ns', port: 8080 },
            },
          },
        },
      ];

      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify(workspacePackages)));

      const result = getModuleFederationConfigs(true);

      expect(mockExecSync).toHaveBeenCalledWith('npm query .workspace --json', {
        encoding: 'utf8',
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'test-module',
        backend: {
          remoteEntry: '/api/test/remoteEntry.js',
          service: { name: 'test-service', namespace: 'test-ns', port: 8080 },
        },
      });
    });

    it('should return empty array when no workspace packages have module-federation config', () => {
      const workspacePackages: WorkspacePackage[] = [{ name: 'package-1' }, { name: 'package-2' }];

      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify(workspacePackages)));

      const result = getModuleFederationConfigs(true);

      expect(result).toEqual([]);
    });
  });

  describe('when MODULE_FEDERATION_CONFIG env var is set', () => {
    it('should parse and return new format configs', () => {
      const configs: ModuleFederationConfig[] = [
        {
          name: 'module-a',
          backend: {
            remoteEntry: '/api/a/remoteEntry.js',
            service: { name: 'service-a', namespace: 'ns-a', port: 8080 },
          },
        },
        {
          name: 'module-b',
          backend: {
            remoteEntry: '/api/b/remoteEntry.js',
            service: { name: 'service-b', namespace: 'ns-b', port: 9090 },
            authorize: true,
            tls: true,
          },
          proxyService: [
            {
              path: '/api/proxy',
              service: { name: 'proxy-service', namespace: 'ns-proxy', port: 3000 },
            },
          ],
        },
      ];

      process.env.MODULE_FEDERATION_CONFIG = JSON.stringify(configs);

      const result = getModuleFederationConfigs();

      expect(result).toEqual(configs);
      expect(mockExecSync).not.toHaveBeenCalled();
    });

    it('should convert old format configs to new format', () => {
      const oldConfig: ModuleFederationConfigOld = {
        name: 'old-module',
        remoteEntry: '/api/old/remoteEntry.js',
        tls: true,
        authorize: true,
        service: { name: 'old-service', namespace: 'old-ns', port: 8080 },
        local: { host: 'localhost', port: 3001 },
        proxy: [{ path: '/api/proxy1', pathRewrite: '/rewritten' }, { path: '/api/proxy2' }],
      };

      process.env.MODULE_FEDERATION_CONFIG = JSON.stringify([oldConfig]);

      const result = getModuleFederationConfigs();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'old-module',
        backend: {
          remoteEntry: '/api/old/remoteEntry.js',
          service: { name: 'old-service', namespace: 'old-ns', port: 8080 },
          authorize: true,
          tls: true,
          localService: { host: 'localhost', port: 3001 },
        },
        proxyService: [
          {
            path: '/api/proxy1',
            pathRewrite: '/rewritten',
            service: { name: 'old-service', namespace: 'old-ns', port: 8080 },
            authorize: true,
            tls: true,
            localService: { host: 'localhost', port: 3001 },
          },
          {
            path: '/api/proxy2',
            service: { name: 'old-service', namespace: 'old-ns', port: 8080 },
            authorize: true,
            tls: true,
            localService: { host: 'localhost', port: 3001 },
          },
        ],
      });
    });

    it('should use OC_PROJECT env var for namespace when old config has no namespace', () => {
      process.env.OC_PROJECT = 'oc-project-ns';

      const oldConfig: ModuleFederationConfigOld = {
        name: 'old-module',
        remoteEntry: '/api/old/remoteEntry.js',
        service: { name: 'old-service', port: 8080 },
      };

      process.env.MODULE_FEDERATION_CONFIG = JSON.stringify([oldConfig]);

      const result = getModuleFederationConfigs();

      expect(result[0].backend?.service.namespace).toBe('oc-project-ns');
    });

    it('should use empty string for namespace when old config has no namespace and OC_PROJECT is not set', () => {
      const oldConfig: ModuleFederationConfigOld = {
        name: 'old-module',
        remoteEntry: '/api/old/remoteEntry.js',
        service: { name: 'old-service', port: 8080 },
      };

      process.env.MODULE_FEDERATION_CONFIG = JSON.stringify([oldConfig]);

      const result = getModuleFederationConfigs();

      expect(result[0].backend?.service.namespace).toBe('');
    });

    it('should handle old config without optional fields', () => {
      const oldConfig: ModuleFederationConfigOld = {
        name: 'minimal-old-module',
        remoteEntry: '/api/minimal/remoteEntry.js',
        service: { name: 'minimal-service', namespace: 'minimal-ns', port: 8080 },
      };

      process.env.MODULE_FEDERATION_CONFIG = JSON.stringify([oldConfig]);

      const result = getModuleFederationConfigs();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'minimal-old-module',
        backend: {
          remoteEntry: '/api/minimal/remoteEntry.js',
          service: { name: 'minimal-service', namespace: 'minimal-ns', port: 8080 },
        },
        proxyService: [],
      });
    });

    it('should handle mixed old and new format configs', () => {
      const oldConfig: ModuleFederationConfigOld = {
        name: 'old-module',
        remoteEntry: '/api/old/remoteEntry.js',
        service: { name: 'old-service', namespace: 'old-ns', port: 8080 },
      };

      const newConfig: ModuleFederationConfig = {
        name: 'new-module',
        backend: {
          remoteEntry: '/api/new/remoteEntry.js',
          service: { name: 'new-service', namespace: 'new-ns', port: 9090 },
        },
      };

      process.env.MODULE_FEDERATION_CONFIG = JSON.stringify([oldConfig, newConfig]);

      const result = getModuleFederationConfigs();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('old-module');
      expect(result[0].backend?.remoteEntry).toBe('/api/old/remoteEntry.js');
      expect(result[1].name).toBe('new-module');
      expect(result[1].backend?.remoteEntry).toBe('/api/new/remoteEntry.js');
    });

    it('should prioritize env var over workspace packages even when fallbackToPackages is true', () => {
      const envConfig: ModuleFederationConfig = {
        name: 'env-module',
        backend: {
          remoteEntry: '/api/env/remoteEntry.js',
          service: { name: 'env-service', namespace: 'env-ns', port: 8080 },
        },
      };

      process.env.MODULE_FEDERATION_CONFIG = JSON.stringify([envConfig]);

      const result = getModuleFederationConfigs(true);

      expect(result).toEqual([envConfig]);
      expect(mockExecSync).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw error when MODULE_FEDERATION_CONFIG contains invalid JSON', () => {
      process.env.MODULE_FEDERATION_CONFIG = 'invalid json';

      expect(() => getModuleFederationConfigs()).toThrow();
    });

    it('should throw error when workspace package query fails', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('npm query failed');
      });

      expect(() => getModuleFederationConfigs(true)).toThrow();
    });

    it('should throw error when workspace package query returns invalid JSON', () => {
      mockExecSync.mockReturnValue(Buffer.from('not valid json'));

      expect(() => getModuleFederationConfigs(true)).toThrow();
    });
  });
});
