import { GetEventsByArtifactIDsResponse } from '#~/__mocks__/third_party/mlmd';
import createGrpcResponse, { GrpcResponse } from './utils';

const mockedEventsByArtifactIdsResponse: GetEventsByArtifactIDsResponse = {
  events: [
    {
      artifactId: 1,
      executionId: 27,
      path: {
        steps: [
          {
            key: 'metrics',
          },
        ],
      },
      type: 4,
      millisecondsSinceEpoch: 1712899529364,
    },
  ],
};

export const mockGetEventsByArtifactIDs = (): GrpcResponse => {
  const binary = GetEventsByArtifactIDsResponse.encode(mockedEventsByArtifactIdsResponse).finish();
  return createGrpcResponse(binary);
};
