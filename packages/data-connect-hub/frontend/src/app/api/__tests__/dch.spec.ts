import { handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import { describe, expect, it, jest } from '@jest/globals';
import { mockConnectionType } from '~/__mocks__/mockConnectionType';
import { getConnectionType, testCredentials } from '~/app/api/dch';

jest.mock('mod-arch-core', () => {
  const { jest: jestMock } = require('@jest/globals') as typeof import('@jest/globals');
  return {
    ...jestMock.requireActual<typeof import('mod-arch-core')>('mod-arch-core'),
    handleRestFailures: jestMock.fn((request: Promise<unknown>) => request),
    isModArchResponse: jestMock.fn(),
    restGET: jestMock.fn(),
  };
});

const mockHandleRestFailures = jest.mocked(handleRestFailures);
const mockIsModArchResponse = jest.mocked(isModArchResponse);
const mockRestGET = jest.mocked(restGET);

describe('getConnectionType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((request) => request);
    mockIsModArchResponse.mockReturnValue(true);
  });

  it('should return a connection type from a valid response', async () => {
    const connectionType = mockConnectionType();
    mockRestGET.mockResolvedValue({ data: connectionType });

    await expect(getConnectionType('')({}, 'test-project', 'postgresql')).resolves.toEqual(
      connectionType,
    );
  });

  it('should encode the connection type id and pass request options to restGET', async () => {
    const opts = { signal: new AbortController().signal };
    mockRestGET.mockResolvedValue({ data: mockConnectionType() });

    await getConnectionType('/data-connect-hub')(opts, 'test-project', 'provider/type one');

    expect(mockRestGET).toHaveBeenCalledWith(
      '/data-connect-hub',
      '/data-connect-hub/api/v1/connection-types/provider%2Ftype%20one',
      { namespace: 'test-project' },
      opts,
    );
  });

  it.each([
    ['a non-mod-arch response', false, { data: mockConnectionType() }],
    ['missing response data', true, { data: undefined }],
    ['an invalid connection type', true, { data: { metadata: {}, resource: {} } }],
  ])('should reject %s', async (_description, isResponse, response) => {
    mockIsModArchResponse.mockReturnValue(isResponse);
    mockRestGET.mockResolvedValue(response);

    await expect(getConnectionType('')({}, 'test-project', 'postgresql')).rejects.toThrow(
      'Invalid response format',
    );
  });

  it('should propagate REST failures', async () => {
    mockRestGET.mockResolvedValue({ data: mockConnectionType() });
    mockHandleRestFailures.mockRejectedValue(new Error('request failed'));

    await expect(getConnectionType('')({}, 'test-project', 'postgresql')).rejects.toThrow(
      'request failed',
    );
  });
});

const response = (status: number, body = '') =>
  ({ status, text: () => Promise.resolve(body) }) as Response;

describe('testCredentials', () => {
  it('rejects when the DCH endpoint does not return 204', async () => {
    const fetchMock = jest
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        response(
          404,
          '{"error":{"code":"connection_check_failed","message":"AWS_S3_BUCKET is required"}}',
        ),
      );
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock });

    await expect(
      testCredentials('')({}, 'test-project', {
        data_connection_type_id: 'postgresql',
        credentials: { URI: 'invalid' },
      }),
    ).rejects.toThrow('AWS_S3_BUCKET is required');
    expect(fetchMock).toHaveBeenCalledWith(
      '/data-connect-hub/api/v1/test/credentials?namespace=test-project',
      expect.objectContaining({ method: 'POST' }),
    );
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  });

  it('resolves when the DCH endpoint returns 204', async () => {
    const fetchMock = jest
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(response(204));
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock });

    await expect(
      testCredentials('')({}, 'test-project', {
        data_connection_type_id: 'postgresql',
        credentials: { URI: 'valid' },
      }),
    ).resolves.toBeUndefined();
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  });
});
