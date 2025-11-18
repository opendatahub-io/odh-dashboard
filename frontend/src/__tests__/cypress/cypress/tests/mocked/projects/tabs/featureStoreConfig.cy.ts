import { mockDashboardConfig, mockK8sResourceList, mockProjectK8sResource } from '#~/__mocks__';
import { mockConfigMap } from '#~/__mocks__/mockConfigMap';
import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import { projectDetails } from '#~/__tests__/cypress/cypress/pages/projects';
import { featureStoreIntegration } from '#~/__tests__/cypress/cypress/pages/featureStoreIntegration';
import { ProjectModel } from '#~/__tests__/cypress/cypress/utils/models';
import { DataScienceStackComponent } from '#~/concepts/areas/types';
import type { ConfigMapKind } from '#~/k8sTypes';

const mockFeatureStoreConfigMap = (
  options: {
    name?: string;
    namespace?: string;
    project?: string;
    hasAccess?: boolean;
    creationTimestamp?: string;
  } = {},
): ConfigMapKind => {
  const {
    name = 'feature-store-config',
    namespace = 'test-project',
    project = 'my-feature-store',
    creationTimestamp = '2023-01-01T00:00:00Z',
  } = options;

  const yamlContent = `project: ${project}
repository: https://github.com/my-org/my-feature-store
branch: main
`;

  const configMap = mockConfigMap({
    name,
    namespace,
    data: {
      'feature_store.yaml': yamlContent,
    },
  });

  configMap.metadata.creationTimestamp = creationTimestamp;

  return configMap;
};

const mockFeatureStoreResponse = (
  configs: Array<{
    namespace: string;
    configName: string;
    configMap: ConfigMapKind;
    hasAccessToFeatureStore: boolean;
  }> = [],
) => ({
  clientConfigs: configs,
  namespaces: configs.map((config) => ({
    namespace: config.namespace,
    clientConfigs: [config.configName],
  })),
});

const initIntercepts = ({
  isEmpty = false,
  disableFeatureStore = false,
  configs = [],
}: {
  isEmpty?: boolean;
  disableFeatureStore?: boolean;
  configs?: Array<{
    name?: string;
    namespace?: string;
    project?: string;
    hasAccess?: boolean;
    creationTimestamp?: string;
  }>;
} = {}) => {
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: 'test-project' })]),
  );

  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.FEAST_OPERATOR]: {
          managementState: disableFeatureStore ? 'Removed' : 'Managed',
        },
      },
    }),
  );

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableFeatureStore,
    }),
  );

  if (disableFeatureStore) {
    cy.interceptOdh('GET /api/featurestores/workbench-integration', mockFeatureStoreResponse([]));
  } else {
    const mockConfigs = isEmpty
      ? []
      : configs.map((config) => ({
          namespace: config.namespace || 'test-project',
          configName: config.name || 'feature-store-config',
          configMap: mockFeatureStoreConfigMap(config),
          hasAccessToFeatureStore: config.hasAccess !== false,
        }));

    cy.interceptOdh(
      'GET /api/featurestores/workbench-integration',
      mockFeatureStoreResponse(mockConfigs),
    );
  }
};

describe('Feature Store Config', () => {
  it('should show empty state when no feature store configs exist', () => {
    initIntercepts({ isEmpty: true });
    projectDetails.visit('test-project');
    projectDetails.findTab('Feature store integration').click();

    featureStoreIntegration.findEmptyState().should('exist');
  });

  it('should display feature store configs table', () => {
    const configs = [
      {
        name: 'config-1',
        project: 'project-1',
        hasAccess: true,
        creationTimestamp: '2023-01-01T00:00:00Z',
      },
      {
        name: 'config-2',
        project: 'project-2',
        hasAccess: false,
        creationTimestamp: '2023-01-02T00:00:00Z',
      },
    ];

    initIntercepts({ configs });
    projectDetails.visit('test-project');
    projectDetails.findTab('Feature store integration').click();
    featureStoreIntegration.findTable().should('exist');
    featureStoreIntegration.shouldShowConfig('config-1');
    featureStoreIntegration.shouldShowConfig('config-2');
    featureStoreIntegration.getConfigRow('config-1').shouldHaveProject('project-1');
    featureStoreIntegration.getConfigRow('config-2').shouldHaveProject('project-2');
  });

  it('should filter configs by name', () => {
    const configs = [
      { name: 'alpha-config', project: 'alpha-project' },
      { name: 'beta-config', project: 'beta-project' },
    ];

    initIntercepts({ configs });
    projectDetails.visit('test-project');
    projectDetails.findTab('Feature store integration').click();
    featureStoreIntegration.findTable().should('exist');
    featureStoreIntegration.findNameFilter().type('alpha');
    featureStoreIntegration.shouldShowConfig('alpha-config');
    featureStoreIntegration.shouldNotShowConfig('beta-config');
  });

  it('should filter configs by project', () => {
    const configs = [
      { name: 'config-1', project: 'alpha-project' },
      { name: 'config-2', project: 'beta-project' },
    ];

    initIntercepts({ configs });
    projectDetails.visit('test-project');
    projectDetails.findTab('Feature store integration').click();

    featureStoreIntegration.findTable().should('exist');
    featureStoreIntegration.selectFilterType('Associated Feature Store Repository');
    featureStoreIntegration.findProjectFilter().type('alpha');
    featureStoreIntegration.shouldShowConfig('config-1');
    featureStoreIntegration.shouldNotShowConfig('config-2');
  });

  it('should toggle show only accessible configs', () => {
    const configs = [
      { name: 'accessible-config', hasAccess: true },
      { name: 'inaccessible-config', hasAccess: false },
    ];

    initIntercepts({ configs });
    projectDetails.visit('test-project');
    projectDetails.findTab('Feature store integration').click();

    featureStoreIntegration.findTable().should('exist');
    featureStoreIntegration.shouldShowConfig('accessible-config');
    featureStoreIntegration.shouldShowConfig('inaccessible-config');
    featureStoreIntegration.toggleShowOnlyAccessible();
    featureStoreIntegration.shouldShowConfig('accessible-config');
    featureStoreIntegration.shouldNotShowConfig('inaccessible-config');
  });

  it('should disable selection for inaccessible configs', () => {
    const configs = [
      { name: 'accessible-config', hasAccess: true },
      { name: 'inaccessible-config', hasAccess: false },
    ];

    initIntercepts({ configs });
    projectDetails.visit('test-project');
    projectDetails.findTab('Feature store integration').click();

    featureStoreIntegration.getConfigRow('accessible-config').shouldBeAccessible();
    featureStoreIntegration.getConfigRow('inaccessible-config').shouldBeInaccessible();
  });

  it('should generate Python script when configs are selected', () => {
    const configs = [
      { name: 'config-1', project: 'project-1', hasAccess: true },
      { name: 'config-2', project: 'project-2', hasAccess: true },
    ];

    initIntercepts({ configs });
    projectDetails.visit('test-project');
    projectDetails.findTab('Feature store integration').click();

    featureStoreIntegration.findTable().should('exist');
    featureStoreIntegration.findPythonScriptHeading().should('exist');
    featureStoreIntegration.findSelectConfigmapsText().should('exist');
    cy.get('#code-block-copy-button', { timeout: 10000 }).should('exist').and('be.disabled');
    featureStoreIntegration.getConfigRow('config-1').selectConfig();
    featureStoreIntegration.findSelectConfigmapsText().should('not.exist');
    featureStoreIntegration.findCodeBlockCopyButton().should('exist').and('not.be.disabled');
    featureStoreIntegration
      .findCodeBlockContent()
      .should('not.be.empty')
      .and('contain.text', 'config_1')
      .and('contain.text', 'project-1')
      .and('contain.text', 'FeatureStore')
      .and('contain.text', 'import');
  });

  it('should copy Python script to clipboard', () => {
    const configs = [{ name: 'config-1', project: 'project-1', hasAccess: true }];

    initIntercepts({ configs });
    projectDetails.visit('test-project');
    projectDetails.findTab('Feature store integration').click();

    featureStoreIntegration.findTable().should('exist');
    featureStoreIntegration.getConfigRow('config-1').selectConfig();
    featureStoreIntegration.findSelectConfigmapsText().should('not.exist');
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, 'writeText').resolves();
    });

    featureStoreIntegration.findCodeBlockCopyButton().click();
    featureStoreIntegration.shouldShowSuccessMessage('Successfully copied to clipboard!');
  });

  it('should show tooltip for inaccessible configs', () => {
    const configs = [{ name: 'inaccessible-config', hasAccess: false }];

    initIntercepts({ configs });
    projectDetails.visit('test-project');
    projectDetails.findTab('Feature store integration').click();

    featureStoreIntegration.findTable().should('exist');
    featureStoreIntegration
      .getConfigRow('inaccessible-config')
      .shouldBeInaccessible()
      .hoverOverCheckbox();

    featureStoreIntegration
      .findTooltip()
      .should('contain.text', 'Contact your admin to request permission');
  });

  it('should handle API errors gracefully', () => {
    initIntercepts({ disableFeatureStore: false });

    cy.intercept('GET', '/api/featurestores/workbench-integration', {
      statusCode: 500,
      body: { error: 'Internal server error' },
    });

    projectDetails.visit('test-project');
    projectDetails.findTab('Feature store integration').click();
    featureStoreIntegration.findErrorState().should('exist');
  });
});
