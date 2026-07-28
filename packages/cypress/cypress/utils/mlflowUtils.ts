import type { DSPAMlflowIntegrationMode } from '@odh-dashboard/k8s-core';
import {
  mockDataSciencePipelineApplicationK8sResource,
  mockK8sResourceList,
} from '@odh-dashboard/internal/__mocks__';
import { DataSciencePipelineApplicationModel } from '../utils/models';

export const MLFLOW_BFF_STATUS_URL = '/_bff/mlflow/api/v1/status';

/** Remote entry fetched by `loadRemote('mlflowEmbedded/...')` in the dashboard. */
export const MLFLOW_EMBEDDED_REMOTE_ENTRY_URL =
  '/_mf/mlflowEmbedded/mlflow/static-files/federated/remoteEntry.js';

export const interceptMlflowStatus = (configured = true): void => {
  cy.intercept('GET', MLFLOW_BFF_STATUS_URL, { body: { configured } }).as('mlflowStatus');
};

export const interceptMlflowStatusError = (): void => {
  cy.intercept('GET', MLFLOW_BFF_STATUS_URL, { statusCode: 500 }).as('mlflowStatusError');
};

export const interceptMlflowEmbeddedRemoteFailure = (): void => {
  cy.intercept('GET', MLFLOW_EMBEDDED_REMOTE_ENTRY_URL, { statusCode: 500 }).as(
    'mlflowEmbeddedRemoteEntry',
  );
};

export const interceptDSPAMlflowIntegration = (
  namespace: string,
  mlflowIntegrationMode?: DSPAMlflowIntegrationMode,
): void => {
  cy.interceptK8sList(
    DataSciencePipelineApplicationModel,
    mockK8sResourceList([
      mockDataSciencePipelineApplicationK8sResource({
        namespace,
        mlflowIntegrationMode,
      }),
    ]),
  );
  cy.interceptK8s(
    DataSciencePipelineApplicationModel,
    mockDataSciencePipelineApplicationK8sResource({
      namespace,
      name: 'dspa',
      mlflowIntegrationMode,
    }),
  );
};
