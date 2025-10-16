import { ConfigMapKind } from '#~/k8sTypes';
import {
  getRepositoryInfo,
  getConfigId,
  filterConfigs,
  generatePythonScript,
} from '#~/pages/projects/featureStoreConfig/utils';
import {
  FeatureStoreClientConfig,
  FilterOptions,
} from '#~/pages/projects/featureStoreConfig/types';

const NAMESPACE = {
  TEST: 'test-namespace',
  DEFAULT: 'default',
  VIEWER: 'viewer',
  TEST_NS: 'test',
  UNKNOWN: 'unknown',
} as const;

const CONFIG_NAME = {
  TEST: 'test-config',
  BANKING: 'banking-config',
  RETAIL: 'retail-config',
  TEST_BANKING: 'test-banking-config',
} as const;

const PROJECT_NAME = {
  TEST: 'test-project',
  BANKING: 'banking-project',
  RETAIL: 'retail-project',
  TEST_BANKING: 'test-banking',
} as const;

const TIMESTAMP = {
  JAN_10: '2024-01-10T10:00:00Z',
  JAN_15: '2024-01-15T10:00:00Z',
  JAN_20: '2024-01-20T10:00:00Z',
} as const;

const mockConfigMap = (overrides: Partial<ConfigMapKind> = {}): ConfigMapKind => ({
  apiVersion: 'v1',
  kind: 'ConfigMap',
  metadata: {
    name: CONFIG_NAME.TEST,
    namespace: NAMESPACE.TEST,
    creationTimestamp: TIMESTAMP.JAN_15,
    ...overrides.metadata,
  },
  data: overrides.data ?? {
    'feature_store.yaml': `project: ${PROJECT_NAME.TEST}\nregistry:\n  path: test-registry`,
  },
});

const mockFeatureStoreConfig = (
  overrides: Partial<FeatureStoreClientConfig> = {},
): FeatureStoreClientConfig => ({
  namespace: NAMESPACE.TEST,
  configName: CONFIG_NAME.TEST,
  configMap: mockConfigMap(),
  hasAccessToFeatureStore: true,
  ...overrides,
});

describe('featureStoreConfig utils', () => {
  describe('getRepositoryInfo', () => {
    it('should extract project name from YAML content', () => {
      const configMap = mockConfigMap({
        data: {
          'feature_store.yaml': `project: ${PROJECT_NAME.BANKING}\nregistry:\n  path: test`,
        },
      });

      const result = getRepositoryInfo(configMap);

      expect(result).toBe(PROJECT_NAME.BANKING);
    });

    it('should handle YAML with spaces around project name', () => {
      const configMap = mockConfigMap({
        data: {
          'feature_store.yaml': 'project:   spaced-project  \nregistry:\n  path: test',
        },
      });

      const result = getRepositoryInfo(configMap);

      expect(result).toBe('spaced-project');
    });

    it('should return namespace/name when feature_store.yaml is missing', () => {
      const configMap = mockConfigMap({
        data: {},
      });

      const result = getRepositoryInfo(configMap);

      expect(result).toBe(`${NAMESPACE.TEST}/${CONFIG_NAME.TEST}`);
    });

    it('should return namespace/name when project field is missing from YAML', () => {
      const configMap = mockConfigMap({
        data: {
          'feature_store.yaml': 'registry:\n  path: test',
        },
      });

      const result = getRepositoryInfo(configMap);

      expect(result).toBe(`${NAMESPACE.TEST}/${CONFIG_NAME.TEST}`);
    });

    it('should handle missing namespace gracefully', () => {
      const configMap = mockConfigMap({
        metadata: {
          name: CONFIG_NAME.TEST,
          namespace: NAMESPACE.UNKNOWN,
        },
        data: {},
      });

      const result = getRepositoryInfo(configMap);

      expect(result).toBe(`${NAMESPACE.UNKNOWN}/${CONFIG_NAME.TEST}`);
    });
  });

  describe('getConfigId', () => {
    it('should create unique ID from namespace and configName', () => {
      const config = mockFeatureStoreConfig({
        namespace: NAMESPACE.VIEWER,
        configName: 'feast-banking-client',
      });

      const result = getConfigId(config);

      expect(result).toBe(`${NAMESPACE.VIEWER}/feast-banking-client`);
    });

    it('should handle different namespaces with same config name', () => {
      const config1 = mockFeatureStoreConfig({
        namespace: 'namespace1',
        configName: 'same-name',
      });
      const config2 = mockFeatureStoreConfig({
        namespace: 'namespace2',
        configName: 'same-name',
      });

      expect(getConfigId(config1)).not.toBe(getConfigId(config2));
      expect(getConfigId(config1)).toBe('namespace1/same-name');
      expect(getConfigId(config2)).toBe('namespace2/same-name');
    });
  });

  describe('filterConfigs', () => {
    const configs: FeatureStoreClientConfig[] = [
      mockFeatureStoreConfig({
        namespace: NAMESPACE.DEFAULT,
        configName: CONFIG_NAME.BANKING,
        configMap: mockConfigMap({
          data: {
            'feature_store.yaml': `project: ${PROJECT_NAME.BANKING}`,
          },
          metadata: {
            name: CONFIG_NAME.BANKING,
            namespace: NAMESPACE.DEFAULT,
            creationTimestamp: TIMESTAMP.JAN_15,
          },
        }),
      }),
      mockFeatureStoreConfig({
        namespace: NAMESPACE.VIEWER,
        configName: CONFIG_NAME.RETAIL,
        configMap: mockConfigMap({
          data: {
            'feature_store.yaml': `project: ${PROJECT_NAME.RETAIL}`,
          },
          metadata: {
            name: CONFIG_NAME.RETAIL,
            namespace: NAMESPACE.VIEWER,
            creationTimestamp: TIMESTAMP.JAN_20,
          },
        }),
      }),
      mockFeatureStoreConfig({
        namespace: NAMESPACE.TEST_NS,
        configName: CONFIG_NAME.TEST_BANKING,
        configMap: mockConfigMap({
          data: {
            'feature_store.yaml': `project: ${PROJECT_NAME.TEST_BANKING}`,
          },
          metadata: {
            name: CONFIG_NAME.TEST_BANKING,
            namespace: NAMESPACE.TEST_NS,
            creationTimestamp: TIMESTAMP.JAN_10,
          },
        }),
      }),
    ];

    describe('NAME filter', () => {
      it('should filter by config name (case insensitive)', () => {
        const filterData = {
          [FilterOptions.NAME]: 'banking',
          [FilterOptions.PROJECT]: '',
          [FilterOptions.CREATED]: '',
        };

        const result = filterConfigs(configs, filterData);

        expect(result).toHaveLength(2);
        expect(result[0].configName).toBe(CONFIG_NAME.BANKING);
        expect(result[1].configName).toBe(CONFIG_NAME.TEST_BANKING);
      });

      it('should handle uppercase search term', () => {
        const filterData = {
          [FilterOptions.NAME]: 'RETAIL',
          [FilterOptions.PROJECT]: '',
          [FilterOptions.CREATED]: '',
        };

        const result = filterConfigs(configs, filterData);

        expect(result).toHaveLength(1);
        expect(result[0].configName).toBe(CONFIG_NAME.RETAIL);
      });

      it('should return all configs when name filter is empty', () => {
        const filterData = {
          [FilterOptions.NAME]: '',
          [FilterOptions.PROJECT]: '',
          [FilterOptions.CREATED]: '',
        };

        const result = filterConfigs(configs, filterData);

        expect(result).toHaveLength(3);
      });
    });

    describe('PROJECT filter', () => {
      it('should filter by project/repository name (case insensitive)', () => {
        const filterData = {
          [FilterOptions.NAME]: '',
          [FilterOptions.PROJECT]: 'banking',
          [FilterOptions.CREATED]: '',
        };

        const result = filterConfigs(configs, filterData);

        expect(result).toHaveLength(2);
        expect(result.map((c) => c.configName)).toContain(CONFIG_NAME.BANKING);
        expect(result.map((c) => c.configName)).toContain(CONFIG_NAME.TEST_BANKING);
      });

      it('should handle uppercase search term for project', () => {
        const filterData = {
          [FilterOptions.NAME]: '',
          [FilterOptions.PROJECT]: 'RETAIL',
          [FilterOptions.CREATED]: '',
        };

        const result = filterConfigs(configs, filterData);

        expect(result).toHaveLength(1);
        expect(result[0].configName).toBe(CONFIG_NAME.RETAIL);
      });
    });

    describe('CREATED filter', () => {
      it('should filter by creation date (greater than or equal)', () => {
        const filterData = {
          [FilterOptions.NAME]: '',
          [FilterOptions.PROJECT]: '',
          [FilterOptions.CREATED]: '2024-01-15T00:00:00Z',
        };

        const result = filterConfigs(configs, filterData);

        expect(result).toHaveLength(2);
        expect(result.map((c) => c.configName)).toContain(CONFIG_NAME.BANKING);
        expect(result.map((c) => c.configName)).toContain(CONFIG_NAME.RETAIL);
      });

      it('should exclude configs created before the filter date', () => {
        const filterData = {
          [FilterOptions.NAME]: '',
          [FilterOptions.PROJECT]: '',
          [FilterOptions.CREATED]: '2024-01-20T00:00:00Z',
        };

        const result = filterConfigs(configs, filterData);

        expect(result).toHaveLength(1);
        expect(result[0].configName).toBe(CONFIG_NAME.RETAIL);
      });

      it('should exclude configs without creation timestamp', () => {
        const configsWithoutDate: FeatureStoreClientConfig[] = [
          {
            namespace: NAMESPACE.TEST,
            configName: 'no-date-config',
            configMap: {
              apiVersion: 'v1',
              kind: 'ConfigMap',
              metadata: {
                name: 'no-date-config',
                namespace: NAMESPACE.TEST,
                // Intentionally no creationTimestamp property
              },
              data: {
                'feature_store.yaml': `project: ${PROJECT_NAME.TEST}`,
              },
            },
            hasAccessToFeatureStore: true,
          },
        ];

        const filterData = {
          [FilterOptions.NAME]: '',
          [FilterOptions.PROJECT]: '',
          [FilterOptions.CREATED]: '2024-01-15T00:00:00Z',
        };

        const result = filterConfigs(configsWithoutDate, filterData);

        expect(result).toHaveLength(0);
      });
    });

    describe('Combined filters', () => {
      it('should apply multiple filters together', () => {
        const filterData = {
          [FilterOptions.NAME]: 'banking',
          [FilterOptions.PROJECT]: 'banking',
          [FilterOptions.CREATED]: '',
        };

        const result = filterConfigs(configs, filterData);

        expect(result).toHaveLength(2);
      });

      it('should return empty array when no configs match all filters', () => {
        const filterData = {
          [FilterOptions.NAME]: 'retail',
          [FilterOptions.PROJECT]: 'banking',
          [FilterOptions.CREATED]: '',
        };

        const result = filterConfigs(configs, filterData);

        expect(result).toHaveLength(0);
      });

      it('should handle all three filters at once', () => {
        const filterData = {
          [FilterOptions.NAME]: 'banking',
          [FilterOptions.PROJECT]: 'banking',
          [FilterOptions.CREATED]: '2024-01-15T00:00:00Z',
        };

        const result = filterConfigs(configs, filterData);

        expect(result).toHaveLength(1);
        expect(result[0].configName).toBe(CONFIG_NAME.BANKING);
      });
    });
  });

  describe('generatePythonScript', () => {
    it('should return empty string when no configs are selected', () => {
      const result = generatePythonScript([]);

      expect(result).toBe('');
    });

    it('should generate Python script for single config', () => {
      const config = mockFeatureStoreConfig({
        configName: 'test-config',
        configMap: mockConfigMap({
          data: {
            'feature_store.yaml': 'project: test\nregistry:\n  path: test-path',
          },
        }),
      });

      const result = generatePythonScript([config]);

      expect(result).toContain('#!/usr/bin/env python3');
      expect(result).toContain('import yaml');
      expect(result).toContain('from feast import FeatureStore');
      expect(result).toContain('"test_config"');
      expect(result).toContain('project: test');
    });

    it('should generate Python script for multiple configs', () => {
      const configs = [
        mockFeatureStoreConfig({
          configName: 'banking-config',
          configMap: mockConfigMap({
            data: {
              'feature_store.yaml': 'project: banking',
            },
          }),
        }),
        mockFeatureStoreConfig({
          configName: 'retail-config',
          configMap: mockConfigMap({
            data: {
              'feature_store.yaml': 'project: retail',
            },
          }),
        }),
      ];

      const result = generatePythonScript(configs);

      expect(result).toContain('"banking_config"');
      expect(result).toContain('"retail_config"');
      expect(result).toContain('project: banking');
      expect(result).toContain('project: retail');
    });

    it('should sanitize config names for Python variable names', () => {
      const config = mockFeatureStoreConfig({
        configName: 'test-config-with-dashes',
        configMap: mockConfigMap({
          data: {
            'feature_store.yaml': 'project: test',
          },
        }),
      });

      const result = generatePythonScript([config]);

      expect(result).toContain('"test_config_with_dashes"');
      expect(result).not.toContain('"test-config-with-dashes"');
    });

    it('should include proper Python script structure', () => {
      const config = mockFeatureStoreConfig();

      const result = generatePythonScript([config]);

      expect(result).toContain('def create_feature_store_yaml');
      expect(result).toContain('def create_feature_store_object');
      expect(result).toContain('def process_client_configs');
      expect(result).toContain('def print_summary');
      expect(result).toContain('def main');
      expect(result).toContain('if __name__ == "__main__"');
    });
  });
});
