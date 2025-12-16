import { SelectionOptions } from '#~/components/MultiSelection';
import { mockNotebookK8sResource } from '#~/__mocks__';
import {
  generateFeatureStoreCode,
  getFeatureStoresFromNotebook,
  convertFeatureStoresToSelectionOptions,
  getSelectedFeatureStoresFromSelections,
  mapFeatureStoresForNotebook,
} from '#~/pages/projects/screens/spawner/featureStore/utils';
import { WorkbenchFeatureStoreConfig } from '#~/pages/projects/screens/spawner/featureStore/FeatureStoreSelector';

const PROJECT_NAME_CREDIT_SCORING = 'credit_scoring_local';
const PROJECT_NAME_BANKING = 'banking';
const PROJECT_NAME_FRAUD_DETECT = 'fraud_detect';

const MOCK_CREDIT_SCORING_FEATURE_STORE: WorkbenchFeatureStoreConfig = {
  namespace: 'credit-namespace',
  configName: 'feast-sample-git-client',
  projectName: PROJECT_NAME_CREDIT_SCORING,
  configMap: null,
  hasAccessToFeatureStore: true,
};

const MOCK_BANKING_FEATURE_STORE: WorkbenchFeatureStoreConfig = {
  namespace: 'test-feast-banking',
  configName: 'feast-banking-client',
  projectName: PROJECT_NAME_BANKING,
  configMap: null,
  hasAccessToFeatureStore: true,
};

const MOCK_FRAUD_DETECT_FEATURE_STORE: WorkbenchFeatureStoreConfig = {
  namespace: 'test-feast-banking',
  configName: 'feast-fraud-detect-client',
  projectName: PROJECT_NAME_FRAUD_DETECT,
  configMap: null,
  hasAccessToFeatureStore: true,
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

  it('should ignore non-existent project names', () => {
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

    expect(result).toHaveLength(2);
    expect(result.map((fs) => fs.projectName)).toEqual([
      PROJECT_NAME_CREDIT_SCORING,
      PROJECT_NAME_BANKING,
    ]);
  });
});

describe('convertFeatureStoresToSelectionOptions', () => {
  const mockFeatureStores = MOCK_FEATURE_STORES;

  it('should convert feature stores to selection options', () => {
    const result = convertFeatureStoresToSelectionOptions(mockFeatureStores, []);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      id: PROJECT_NAME_CREDIT_SCORING,
      name: PROJECT_NAME_CREDIT_SCORING,
      selected: false,
    });
    expect(result[1]).toEqual({
      id: PROJECT_NAME_BANKING,
      name: PROJECT_NAME_BANKING,
      selected: false,
    });
    expect(result[2]).toEqual({
      id: PROJECT_NAME_FRAUD_DETECT,
      name: PROJECT_NAME_FRAUD_DETECT,
      selected: false,
    });
  });

  it('should mark selected feature stores', () => {
    const selected = [mockFeatureStores[0]];
    const result = convertFeatureStoresToSelectionOptions(mockFeatureStores, selected);

    expect(result[0].selected).toBe(true);
    expect(result[1].selected).toBe(false);
  });

  it('should include missing selected feature stores', () => {
    const missingSelected: WorkbenchFeatureStoreConfig[] = [
      {
        namespace: 'other-namespace',
        configName: 'other-client',
        projectName: 'other_project',
        configMap: null,
        hasAccessToFeatureStore: true,
      },
    ];
    const result = convertFeatureStoresToSelectionOptions(mockFeatureStores, missingSelected);

    expect(result).toHaveLength(4);
    expect(result[3]).toEqual({
      id: 'other_project',
      name: 'other_project',
      selected: true,
    });
  });
});

describe('getSelectedFeatureStoresFromSelections', () => {
  const mockFeatureStores = MOCK_FEATURE_STORES;

  it('should return selected feature stores from available configs', () => {
    const selections: SelectionOptions[] = [
      { id: PROJECT_NAME_CREDIT_SCORING, name: PROJECT_NAME_CREDIT_SCORING, selected: true },
      { id: PROJECT_NAME_BANKING, name: PROJECT_NAME_BANKING, selected: false },
    ];
    const result = getSelectedFeatureStoresFromSelections(selections, mockFeatureStores, []);

    expect(result).toHaveLength(1);
    expect(result[0].projectName).toBe(PROJECT_NAME_CREDIT_SCORING);
  });

  it('should return empty array when no selections are selected', () => {
    const selections: SelectionOptions[] = [
      { id: PROJECT_NAME_CREDIT_SCORING, name: PROJECT_NAME_CREDIT_SCORING, selected: false },
      { id: PROJECT_NAME_BANKING, name: PROJECT_NAME_BANKING, selected: false },
    ];
    const result = getSelectedFeatureStoresFromSelections(selections, mockFeatureStores, []);

    expect(result).toHaveLength(0);
  });

  it('should fallback to selectedFeatureStores when not found in configs', () => {
    const selections: SelectionOptions[] = [
      { id: 'other_project', name: 'other_project', selected: true },
    ];
    const selectedFeatureStores: WorkbenchFeatureStoreConfig[] = [
      {
        namespace: 'other-namespace',
        configName: 'other-client',
        projectName: 'other_project',
        configMap: null,
        hasAccessToFeatureStore: true,
      },
    ];
    const result = getSelectedFeatureStoresFromSelections(
      selections,
      mockFeatureStores,
      selectedFeatureStores,
    );

    expect(result).toHaveLength(1);
    expect(result[0].projectName).toBe('other_project');
  });

  it('should filter out undefined results', () => {
    const selections: SelectionOptions[] = [
      { id: 'non_existent', name: 'non_existent', selected: true },
    ];
    const result = getSelectedFeatureStoresFromSelections(selections, mockFeatureStores, []);

    expect(result).toHaveLength(0);
  });

  it('should prioritize featureStoreConfigs over selectedFeatureStores when both exist', () => {
    const availableConfig = MOCK_CREDIT_SCORING_FEATURE_STORE;
    const previousConfig: WorkbenchFeatureStoreConfig = {
      namespace: 'old-namespace',
      configName: 'old-client',
      projectName: PROJECT_NAME_CREDIT_SCORING,
      configMap: null,
      hasAccessToFeatureStore: false,
    };
    const selections: SelectionOptions[] = [
      { id: PROJECT_NAME_CREDIT_SCORING, name: PROJECT_NAME_CREDIT_SCORING, selected: true },
    ];
    const result = getSelectedFeatureStoresFromSelections(
      selections,
      [availableConfig],
      [previousConfig],
    );

    expect(result).toHaveLength(1);
    // Should use the available config (from featureStoreConfigs), not the previous one
    expect(result[0].namespace).toBe('credit-namespace');
    expect(result[0].hasAccessToFeatureStore).toBe(true);
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
