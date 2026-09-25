import { KubeFastifyInstance } from '../types';
import {
  fetchAIHub,
  getAIHubErrorStatus,
  getAIHubRouteError,
  isAIHubResourceNotFoundError,
} from '../utils/aihub';

describe('fetchAIHub', () => {
  const mockGetClusterCustomObject = jest.fn();
  const mockFastify = {
    kube: { customObjectsApi: { getClusterCustomObject: mockGetClusterCustomObject } },
    log: { error: jest.fn() },
  } as unknown as KubeFastifyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the AIHub CR when found', async () => {
    const aihub = {
      metadata: { name: 'default-aihub' },
      spec: { instancesNamespace: 'odh-model-registries' },
    };
    mockGetClusterCustomObject.mockResolvedValue({ body: aihub });

    const result = await fetchAIHub(mockFastify);

    expect(result).toEqual(aihub);
    expect(mockGetClusterCustomObject).toHaveBeenCalledWith(
      'components.platform.opendatahub.io',
      'v1alpha1',
      'aihubs',
      'default-aihub',
    );
  });

  it('should preserve a Kubernetes API failure for the watcher to handle', async () => {
    const error = { response: { statusCode: 403, body: 'forbidden' } };
    mockGetClusterCustomObject.mockRejectedValue(error);

    await expect(fetchAIHub(mockFastify)).rejects.toBe(error);
    expect(mockFastify.log.error).toHaveBeenCalledWith(
      { error, statusCode: 403 },
      'Failure to fetch AIHub',
    );
  });
});

describe('getAIHubErrorStatus', () => {
  it('should read the Kubernetes status code from supported error shapes', () => {
    expect(getAIHubErrorStatus({ response: { statusCode: 404 } })).toBe(404);
    expect(getAIHubErrorStatus({ response: { status: 403 } })).toBe(403);
    expect(getAIHubErrorStatus({ statusCode: 500 })).toBe(500);
  });
});

describe('isAIHubResourceNotFoundError', () => {
  it('should identify a Kubernetes NotFound response for default-aihub', () => {
    expect(
      isAIHubResourceNotFoundError({
        response: {
          statusCode: 404,
          body: {
            reason: 'NotFound',
            details: {
              name: 'default-aihub',
              group: 'components.platform.opendatahub.io',
              kind: 'aihubs',
            },
          },
        },
      }),
    ).toBe(true);
  });

  it.each([
    {
      response: {
        statusCode: 404,
        body: { reason: 'NotFound' },
      },
    },
    {
      response: {
        statusCode: 404,
        body: {
          reason: 'NotFound',
          details: {
            name: 'other-aihub',
            group: 'components.platform.opendatahub.io',
            kind: 'aihubs',
          },
        },
      },
    },
    {
      response: {
        statusCode: 404,
        body: {
          reason: 'NotFound',
          details: {
            name: 'default-aihub',
            group: 'components.platform.opendatahub.io',
            kind: 'otherresources',
          },
        },
      },
    },
  ])('should reject a 404 that does not identify default-aihub', (error) => {
    expect(isAIHubResourceNotFoundError(error)).toBe(false);
  });
});

describe('getAIHubRouteError', () => {
  it('should map an unclassified AIHub 404 to an unavailable API error', () => {
    const error = getAIHubRouteError({ response: { statusCode: 404 } });

    expect(error.statusCode).toBe(503);
    expect(error.message).toContain('Verify that AIHub is installed');
  });

  it('should describe a dashboard service-account permission failure accurately', () => {
    const error = getAIHubRouteError({ response: { statusCode: 403 } });

    expect(error.statusCode).toBe(500);
    expect(error.message).toContain('Dashboard is not permitted');
  });

  it('should turn unavailable Kubernetes API failures into a retryable service error', () => {
    const error = getAIHubRouteError({ response: { statusCode: 500 } });

    expect(error.statusCode).toBe(503);
  });
});
