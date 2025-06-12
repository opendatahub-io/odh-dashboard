import { GetEventsByExecutionIDsResponse } from '#~/__mocks__/third_party/mlmd';
import createGrpcResponse, { GrpcResponse } from './utils';

const mockedEventsByExecutionIdsResponse: GetEventsByExecutionIDsResponse = {
  events: [
    {
      artifactId: 7,
      executionId: 288,
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
    {
      artifactId: 9,
      executionId: 290,
      path: {
        steps: [
          {
            key: 'metrics',
          },
        ],
      },
      type: 4,
      millisecondsSinceEpoch: 1712899529842,
    },
    {
      artifactId: 8,
      executionId: 291,
      path: {
        steps: [
          {
            key: 'metrics',
          },
        ],
      },
      type: 4,
      millisecondsSinceEpoch: 1712899530048,
    },
    {
      artifactId: 16,
      executionId: 292,
      path: {
        steps: [
          {
            key: 'markdown_artifact',
          },
        ],
      },
      type: 4,
      millisecondsSinceEpoch: 1712899531648,
    },
    {
      artifactId: 18,
      executionId: 289,
      path: {
        steps: [
          {
            key: 'html_artifact',
          },
        ],
      },
      type: 4,
      millisecondsSinceEpoch: 1712899531648,
    },
  ],
};

export const mockGetEventsByExecutionIDs = (): GrpcResponse => {
  const binary = GetEventsByExecutionIDsResponse.encode(
    mockedEventsByExecutionIdsResponse,
  ).finish();
  return createGrpcResponse(binary);
};
