import { GetArtifactTypesResponse } from '#~/__mocks__/third_party/mlmd';
import createGrpcResponse, { GrpcResponse } from './utils';

const mockedArtifactTypesResponse: GetArtifactTypesResponse = {
  artifactTypes: [
    {
      id: 14,
      name: 'system.Artifact',
      properties: {},
    },
    {
      id: 15,
      name: 'system.Dataset',
      properties: {},
    },
    {
      id: 16,
      name: 'system.Model',
      properties: {},
    },
    {
      id: 17,
      name: 'system.Metrics',
      properties: {},
    },
    {
      id: 18,
      name: 'system.ClassificationMetrics',
      properties: {},
    },
    {
      id: 19,
      name: 'system.Markdown',
      properties: {},
    },
    {
      id: 20,
      name: 'system.HTML',
      properties: {},
    },
  ],
};

export const mockGetArtifactTypes = (): GrpcResponse => {
  const binary = GetArtifactTypesResponse.encode(mockedArtifactTypesResponse).finish();
  return createGrpcResponse(binary);
};
