import type { Interception } from 'cypress/types/net-stubbing';
import { mockGetArtifactTypes } from '~/__mocks__/mlmd/mockGetArtifactTypes';
import { mockGetArtifactsByContext } from '~/__mocks__/mlmd/mockGetArtifactsByContext';
import { mockGetContextByTypeAndName } from '~/__mocks__/mlmd/mockGetContextByTypeAndName';
import { mockGetEventsByExecutionIDs } from '~/__mocks__/mlmd/mockGetEventsByExecutionIDs';
import { mockGetExecutions, mockGetNoExecutions } from '~/__mocks__/mlmd/mockGetExecutions';
import { mockGetExecutionsByContext } from '~/__mocks__/mlmd/mockGetExecutionsByContext';
import { mockGetExecutionsByID } from '~/__mocks__/mlmd/mockGetExecutionsByID';
import { GetExecutionsRequest } from '~/__mocks__/third_party/mlmd';

export const initMlmdIntercepts = (
  projectName: string,
  options: { isExecutionsEmpty?: boolean; noMetrics?: boolean } = {},
): void => {
  const { isExecutionsEmpty, noMetrics } = options;
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
    mockGetArtifactsByContext(noMetrics),
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

// We remove the first 5 bits of the Uint8Array due to an offset from createGrpcResponse
export const decodeGetExecutionsRequest = (interception: Interception): GetExecutionsRequest => {
  const mlmdArr = new Uint8Array(interception.request.body);
  return GetExecutionsRequest.decode(mlmdArr.slice(5));
};
