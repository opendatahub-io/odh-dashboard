import { mockNotebookK8sResource } from '#~/__mocks__';
import {
  generateFeatureStoreCode,
  getFeatureStoresFromNotebook,
  mapFeatureStoresForNotebook,
  generateFeastMetadata,
} from '#~/pages/projects/screens/spawner/featureStore/utils';
import { WorkbenchFeatureStoreConfig } from '#~/pages/projects/screens/spawner/featureStore/useWorkbenchFeatureStores';

const PROJECT_NAME_CREDIT_SCORING = 'credit_scoring_local';
const PROJECT_NAME_BANKING = 'banking';
const PROJECT_NAME_FRAUD_DETECT = 'fraud_detect';

const MOCK_CREDIT_SCORING_FEATURE_STORE: WorkbenchFeatureStoreConfig = {
  namespace: 'credit-namespace',
  configName: 'feast-sample-git-client',
  projectName: PROJECT_NAME_CREDIT_SCORING,
  configMap: null,
  hasAccessToFeatureStore: true,
  permissions: ['Read', 'Write'],
};

const MOCK_BANKING_FEATURE_STORE: WorkbenchFeatureStoreConfig = {
  namespace: 'test-feast-banking',
  configName: 'feast-banking-client',
  projectName: PROJECT_NAME_BANKING,
  configMap: null,
  hasAccessToFeatureStore: true,
  permissions: ['Read'],
};

const MOCK_FRAUD_DETECT_FEATURE_STORE: WorkbenchFeatureStoreConfig = {
  namespace: 'test-feast-banking',
  configName: 'feast-fraud-detect-client',
  projectName: PROJECT_NAME_FRAUD_DETECT,
  configMap: null,
  hasAccessToFeatureStore: true,
  permissions: ['Read', 'Describe'],
};

const MOCK_FEATURE_STORES: WorkbenchFeatureStoreConfig[] = [
  MOCK_CREDIT_SCORING_FEATURE_STORE,
  MOCK_BANKING_FEATURE_STORE,
  MOCK_FRAUD_DETECT_FEATURE_STORE,
];

const EXPECTED_CREDIT_SCORING_NOTEBOOK_FORMAT = {
  namespace: 'credit-namespace',
  configName: 'feast-sample-git-client',
  projectName: PROJECT_NAME_CREDIT_SCORING,
};

const EXPECTED_BANKING_NOTEBOOK_FORMAT = {
  namespace: 'test-feast-banking',
  configName: 'feast-banking-client',
  projectName: PROJECT_NAME_BANKING,
};

const EXPECTED_FRAUD_DETECT_NOTEBOOK_FORMAT = {
  namespace: 'test-feast-banking',
  configName: 'feast-fraud-detect-client',
  projectName: PROJECT_NAME_FRAUD_DETECT,
};

describe('generateFeatureStoreCode', () => {
  it('should generate correct Python code', () => {
    const code = generateFeatureStoreCode();

    expect(code).toContain('from feast import FeatureStore');
    expect(code).toContain('fs_banking = FeatureStore');
    expect(code).toContain('/opt/app-root/config/feast_configs/fs_banking.yaml');
    expect(code).toContain('list_feature_views()');
    expect(code).toContain('get_historical_features');
    expect(code).toContain('get_online_features');
  });
});

describe('getFeatureStoresFromNotebook', () => {
  const mockFeatureStores = MOCK_FEATURE_STORES;

  it('should return empty array when annotation is missing', () => {
    const notebook = mockNotebookK8sResource({});
    const result = getFeatureStoresFromNotebook(notebook, mockFeatureStores);

    expect(result).toHaveLength(0);
  });

  it('should return matching feature stores from annotation', () => {
    const notebook = mockNotebookK8sResource({
      opts: {
        metadata: {
          annotations: {
            'opendatahub.io/feast-config': `${PROJECT_NAME_CREDIT_SCORING},${PROJECT_NAME_BANKING}`,
          },
        },
      },
    });
    const result = getFeatureStoresFromNotebook(notebook, mockFeatureStores);

    expect(result).toHaveLength(2);
    expect(result[0].projectName).toBe(PROJECT_NAME_CREDIT_SCORING);
    expect(result[1].projectName).toBe(PROJECT_NAME_BANKING);
  });

  it('should handle single project name in annotation', () => {
    const notebook = mockNotebookK8sResource({
      opts: {
        metadata: {
          annotations: {
            'opendatahub.io/feast-config': PROJECT_NAME_CREDIT_SCORING,
          },
        },
      },
    });
    const result = getFeatureStoresFromNotebook(notebook, mockFeatureStores);

    expect(result).toHaveLength(1);
    expect(result[0].projectName).toBe(PROJECT_NAME_CREDIT_SCORING);
  });

  it('should trim whitespace from project names', () => {
    const notebook = mockNotebookK8sResource({
      opts: {
        metadata: {
          annotations: {
            'opendatahub.io/feast-config': `${PROJECT_NAME_CREDIT_SCORING} , ${PROJECT_NAME_BANKING} `,
          },
        },
      },
    });
    const result = getFeatureStoresFromNotebook(notebook, mockFeatureStores);

    expect(result).toHaveLength(2);
  });

  it('should return unavailable placeholder for non-existent project names', () => {
    const notebook = mockNotebookK8sResource({
      opts: {
        metadata: {
          annotations: {
            'opendatahub.io/feast-config': `${PROJECT_NAME_CREDIT_SCORING},non_existent,${PROJECT_NAME_BANKING}`,
          },
        },
      },
    });
    const result = getFeatureStoresFromNotebook(notebook, mockFeatureStores);

    expect(result).toHaveLength(3);
    expect(result.map((fs) => fs.projectName)).toEqual([
      PROJECT_NAME_CREDIT_SCORING,
      'non_existent',
      PROJECT_NAME_BANKING,
    ]);
    expect(result[0].isUnavailable).toBeUndefined();
    expect(result[1].isUnavailable).toBe(true);
    expect(result[1].namespace).toBe('');
    expect(result[1].configName).toBe('');
    expect(result[1].hasAccessToFeatureStore).toBe(false);
    expect(result[1].permissions).toEqual([]);
    expect(result[2].isUnavailable).toBeUndefined();
  });

  it('should not return duplicate configs when annotation lists the same project twice', () => {
    const notebook = mockNotebookK8sResource({
      opts: {
        metadata: {
          annotations: {
            'opendatahub.io/feast-config': `${PROJECT_NAME_BANKING},${PROJECT_NAME_BANKING}`,
          },
        },
      },
    });

    const result = getFeatureStoresFromNotebook(notebook, mockFeatureStores);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(MOCK_BANKING_FEATURE_STORE);
  });
});

describe('mapFeatureStoresForNotebook', () => {
  const mockFeatureStores = MOCK_FEATURE_STORES;

  it('should map feature stores to notebook format', () => {
    const result = mapFeatureStoresForNotebook(mockFeatureStores);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(EXPECTED_CREDIT_SCORING_NOTEBOOK_FORMAT);
    expect(result[1]).toEqual(EXPECTED_BANKING_NOTEBOOK_FORMAT);
    expect(result[2]).toEqual(EXPECTED_FRAUD_DETECT_NOTEBOOK_FORMAT);
  });

  it('should return empty array for empty input', () => {
    const result = mapFeatureStoresForNotebook([]);

    expect(result).toHaveLength(0);
  });
});

describe('generateFeastMetadata', () => {
  describe('create scenario', () => {
    it('should return feature stores with annotations and labels when feature stores are selected', () => {
      const result = generateFeastMetadata(MOCK_FEATURE_STORES, undefined, false);

      expect(result.featureStores).toHaveLength(3);
      expect(result.annotations).toEqual({
        'opendatahub.io/feast-config': `${PROJECT_NAME_CREDIT_SCORING},${PROJECT_NAME_BANKING},${PROJECT_NAME_FRAUD_DETECT}`,
      });
      expect(result.labels).toEqual({
        'opendatahub.io/feast-integration': 'true',
      });
    });

    it('should return only feature stores without annotations/labels when no feature stores selected', () => {
      const result = generateFeastMetadata([], undefined, false);

      expect(result.featureStores).toHaveLength(0);
      expect(result.annotations).toBeUndefined();
      expect(result.labels).toBeUndefined();
    });

    it('should return single feature store with correct annotation format', () => {
      const result = generateFeastMetadata([MOCK_CREDIT_SCORING_FEATURE_STORE], undefined, false);

      expect(result.featureStores).toHaveLength(1);
      expect(result.annotations).toEqual({
        'opendatahub.io/feast-config': PROJECT_NAME_CREDIT_SCORING,
      });
      expect(result.labels).toEqual({
        'opendatahub.io/feast-integration': 'true',
      });
    });
  });

  describe('update scenario', () => {
    it('should add annotations and labels when feature stores are selected', () => {
      const existingNotebook = mockNotebookK8sResource({
        opts: {
          metadata: {
            labels: {},
            annotations: {},
          },
        },
      });
      const result = generateFeastMetadata(MOCK_FEATURE_STORES, existingNotebook, true);

      expect(result.featureStores).toHaveLength(3);
      expect(result.annotations).toEqual({
        'opendatahub.io/feast-config': `${PROJECT_NAME_CREDIT_SCORING},${PROJECT_NAME_BANKING},${PROJECT_NAME_FRAUD_DETECT}`,
      });
      expect(result.labels).toEqual({
        'opendatahub.io/feast-integration': 'true',
      });
    });

    it('should clear annotations but keep label as true when no feature stores selected and they exist', () => {
      const existingNotebook = mockNotebookK8sResource({
        opts: {
          metadata: {
            labels: {
              'opendatahub.io/feast-integration': 'true',
            },
            annotations: {
              'opendatahub.io/feast-config': `${PROJECT_NAME_CREDIT_SCORING},${PROJECT_NAME_BANKING}`,
            },
          },
        },
      });
      const result = generateFeastMetadata([], existingNotebook, true);

      expect(result.featureStores).toHaveLength(0);
      expect(result.annotations).toEqual({
        'opendatahub.io/feast-config': '',
      });
      expect(result.labels).toEqual({
        'opendatahub.io/feast-integration': 'true',
      });
    });

    it('should not include annotations/labels when no feature stores and they do not exist', () => {
      const existingNotebook = mockNotebookK8sResource({
        opts: {
          metadata: {
            labels: {},
            annotations: {},
          },
        },
      });
      const result = generateFeastMetadata([], existingNotebook, true);

      expect(result.featureStores).toHaveLength(0);
      expect(result.annotations).toBeUndefined();
      expect(result.labels).toBeUndefined();
    });

    it('should replace existing annotations when feature stores change', () => {
      const existingNotebook = mockNotebookK8sResource({
        opts: {
          metadata: {
            labels: {
              'opendatahub.io/feast-integration': 'true',
            },
            annotations: {
              'opendatahub.io/feast-config': PROJECT_NAME_CREDIT_SCORING,
            },
          },
        },
      });
      const result = generateFeastMetadata([MOCK_BANKING_FEATURE_STORE], existingNotebook, true);

      expect(result.featureStores).toHaveLength(1);
      expect(result.annotations).toEqual({
        'opendatahub.io/feast-config': PROJECT_NAME_BANKING,
      });
      expect(result.labels).toEqual({
        'opendatahub.io/feast-integration': 'true',
      });
    });

    it('should keep label as true when annotation does not exist', () => {
      const existingNotebook = mockNotebookK8sResource({
        opts: {
          metadata: {
            labels: {
              'opendatahub.io/feast-integration': 'true',
            },
            annotations: {},
          },
        },
      });
      const result = generateFeastMetadata([], existingNotebook, true);

      expect(result.featureStores).toHaveLength(0);
      expect(result.annotations).toBeUndefined();
      expect(result.labels).toEqual({
        'opendatahub.io/feast-integration': 'true',
      });
    });

    it('should clear only annotation when label does not exist', () => {
      const existingNotebook = mockNotebookK8sResource({
        opts: {
          metadata: {
            labels: {},
            annotations: {
              'opendatahub.io/feast-config': PROJECT_NAME_CREDIT_SCORING,
            },
          },
        },
      });
      const result = generateFeastMetadata([], existingNotebook, true);

      expect(result.featureStores).toHaveLength(0);
      expect(result.annotations).toEqual({
        'opendatahub.io/feast-config': '',
      });
      expect(result.labels).toBeUndefined();
    });
  });
});
