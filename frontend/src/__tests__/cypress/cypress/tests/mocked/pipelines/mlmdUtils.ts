import { mockGetArtifactTypes } from '~/__mocks__/mlmd/mockGetArtifactTypes';
import { mockGetArtifactsByContext } from '~/__mocks__/mlmd/mockGetArtifactsByContext';
import { mockGetContextByTypeAndName } from '~/__mocks__/mlmd/mockGetContextByTypeAndName';
import { mockGetEventsByExecutionIDs } from '~/__mocks__/mlmd/mockGetEventsByExecutionIDs';
import { mockGetExecutions, mockGetNoExecutions } from '~/__mocks__/mlmd/mockGetExecutions';
import { mockGetExecutionsByContext } from '~/__mocks__/mlmd/mockGetExecutionsByContext';
import { mockGetExecutionsByID } from '~/__mocks__/mlmd/mockGetExecutionsByID';

export const initMlmdIntercepts = (projectName: string, isExecutionsEmpty?: boolean): void => {
  cy.interceptOdh(
    'POST /api/service/mlmd/:namespace/:serviceName/ml_metadata.MetadataStoreService/GetArtifactTypes',
    { path: { namespace: projectName, serviceName: 'dspa' } },
    mockGetArtifactTypes(),
  );
  cy.interceptOdh(
    'POST /api/service/mlmd/:namespace/:serviceName/ml_metadata.MetadataStoreService/GetContextByTypeAndName',
    { path: { namespace: projectName, serviceName: 'dspa' } },
    mockGetContextByTypeAndName(),
  );
  cy.interceptOdh(
    'POST /api/service/mlmd/:namespace/:serviceName/ml_metadata.MetadataStoreService/GetArtifactsByContext',
    { path: { namespace: projectName, serviceName: 'dspa' } },
    mockGetArtifactsByContext(),
  );
  cy.interceptOdh(
    'POST /api/service/mlmd/:namespace/:serviceName/ml_metadata.MetadataStoreService/GetExecutionsByContext',
    { path: { namespace: projectName, serviceName: 'dspa' } },
    mockGetExecutionsByContext(),
  );
  cy.interceptOdh(
    'POST /api/service/mlmd/:namespace/:serviceName/ml_metadata.MetadataStoreService/GetExecutions',
    { path: { namespace: projectName, serviceName: 'dspa' } },
    isExecutionsEmpty ? mockGetNoExecutions() : mockGetExecutions(),
  );
  cy.interceptOdh(
    'POST /api/service/mlmd/:namespace/:serviceName/ml_metadata.MetadataStoreService/GetExecutionsByID',
    { path: { namespace: projectName, serviceName: 'dspa' } },
    mockGetExecutionsByID(),
  );
  cy.interceptOdh(
    'POST /api/service/mlmd/:namespace/:serviceName/ml_metadata.MetadataStoreService/GetEventsByExecutionIDs',
    { path: { namespace: projectName, serviceName: 'dspa' } },
    mockGetEventsByExecutionIDs(),
  );
};
