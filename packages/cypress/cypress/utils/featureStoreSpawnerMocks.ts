import {
  mockDashboardConfig,
  mockDscStatus,
  mockNotebookK8sResource,
} from '@odh-dashboard/internal/__mocks__';
import type { NotebookKind } from '@odh-dashboard/k8s-core';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';

export const FEATURE_STORE_CREDIT_NAMESPACE = 'credit-namespace';
export const FEATURE_STORE_BANKING_NAMESPACE = 'test-feast-banking';

export const FEATURE_STORE_PROJECT_CREDIT_SCORING = 'credit_scoring_local';
export const FEATURE_STORE_PROJECT_BANKING = 'banking';
export const FEATURE_STORE_PROJECT_FRAUD_DETECT = 'fraud_detect';

export type FeatureStoreProjectSelection = {
  projectName: string;
  namespace: string;
};

export const FEATURE_STORE_SPAWNER_PROJECTS = {
  creditScoring: {
    projectName: FEATURE_STORE_PROJECT_CREDIT_SCORING,
    namespace: FEATURE_STORE_CREDIT_NAMESPACE,
  },
  banking: {
    projectName: FEATURE_STORE_PROJECT_BANKING,
    namespace: FEATURE_STORE_BANKING_NAMESPACE,
  },
  fraudDetect: {
    projectName: FEATURE_STORE_PROJECT_FRAUD_DETECT,
    namespace: FEATURE_STORE_BANKING_NAMESPACE,
  },
} as const satisfies Record<string, FeatureStoreProjectSelection>;

export const mockWorkbenchIntegrationResponse = {
  namespaces: [
    {
      namespace: FEATURE_STORE_CREDIT_NAMESPACE,
      clientConfigs: [
        {
          configName: 'credit-scoring-local',
          projectName: FEATURE_STORE_PROJECT_CREDIT_SCORING,
          hasAccessToFeatureStore: true,
          permissionLevel: ['Read', 'Write'],
        },
      ],
    },
    {
      namespace: FEATURE_STORE_BANKING_NAMESPACE,
      clientConfigs: [
        {
          configName: 'banking',
          projectName: FEATURE_STORE_PROJECT_BANKING,
          hasAccessToFeatureStore: true,
          permissionLevel: ['Read'],
        },
        {
          configName: 'fraud-detect',
          projectName: FEATURE_STORE_PROJECT_FRAUD_DETECT,
          hasAccessToFeatureStore: true,
          permissionLevel: ['Read', 'Describe'],
        },
      ],
    },
  ],
};

export const mockEmptyWorkbenchIntegrationResponse = {
  namespaces: [],
};

type InitFeatureStoreSpawnerInterceptsOptions = {
  workbenchIntegration?:
    | typeof mockWorkbenchIntegrationResponse
    | typeof mockEmptyWorkbenchIntegrationResponse;
  workbenchIntegrationLoadError?: boolean;
  feastOperatorState?: 'Managed' | 'Removed';
};

export const initFeatureStoreSpawnerIntercepts = ({
  workbenchIntegration = mockWorkbenchIntegrationResponse,
  workbenchIntegrationLoadError = false,
  feastOperatorState = 'Managed',
}: InitFeatureStoreSpawnerInterceptsOptions = {}): void => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.WORKBENCHES]: { managementState: 'Managed' },
        [DataScienceStackComponent.FEAST_OPERATOR]: { managementState: feastOperatorState },
      },
    }),
  );

  cy.interceptOdh('GET /api/config', mockDashboardConfig({ disableFeatureStore: false }));
  if (workbenchIntegrationLoadError) {
    cy.intercept('GET', '/api/featurestores/workbench-integration', {
      statusCode: 500,
      body: { message: 'Internal server error' },
    });
  } else {
    cy.interceptOdh('GET /api/featurestores/workbench-integration', workbenchIntegration);
  }
};

export const mockNotebookWithFeastConfig = (
  projectNames: string[],
  name = 'test-notebook',
): NotebookKind =>
  mockNotebookK8sResource({
    name,
    opts: {
      metadata: {
        name,
        annotations: {
          'opendatahub.io/feast-config': projectNames.join(','),
        },
        labels: {
          'opendatahub.io/feast-integration': 'true',
        },
      },
    },
  });
