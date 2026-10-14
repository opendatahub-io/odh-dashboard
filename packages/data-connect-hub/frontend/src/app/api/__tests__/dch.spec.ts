import { handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import { describe, expect, it, jest } from '@jest/globals';
import { mockConnectionType } from '~/__mocks__/mockConnectionType';
import { getConnection, getConnectionType, testCredentials } from '~/app/api/dch';

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

    await expect(
      getConnectionType('')({}, 'test-project', '550e8400-e29b-41d4-a716-446655440003'),
    ).resolves.toEqual(connectionType);
  });

  it('should pass the connection type id and request options to restGET', async () => {
    const opts = { signal: new AbortController().signal };
    mockRestGET.mockResolvedValue({ data: mockConnectionType() });

    await getConnectionType('/data-connect-hub')(
      opts,
      'test-project',
      '550e8400-e29b-41d4-a716-446655440007',
    );

    expect(mockRestGET).toHaveBeenCalledWith(
      '/data-connect-hub',
      '/data-connect-hub/api/v1/connection-types/550e8400-e29b-41d4-a716-446655440007',
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

    await expect(
      getConnectionType('')({}, 'test-project', '550e8400-e29b-41d4-a716-446655440003'),
    ).rejects.toThrow('Invalid response format');
  });

  it('should propagate REST failures', async () => {
    mockRestGET.mockResolvedValue({ data: mockConnectionType() });
    mockHandleRestFailures.mockRejectedValue(new Error('request failed'));

    await expect(
      getConnectionType('')({}, 'test-project', '550e8400-e29b-41d4-a716-446655440003'),
    ).rejects.toThrow('request failed');
  });
});

describe('getConnection', () => {
  const connection = {
    metadata: { id: '550e8400-e29b-41d4-a716-446655440001' },
    resource: {
      name: 'warehouse',
      data_connection_type_id: '550e8400-e29b-41d4-a716-446655440003',
      format: 'tabular' as const,
    },
    status: { state: 'ready' as const },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((request) => request);
    mockIsModArchResponse.mockReturnValue(true);
  });

  it('should return a connection from a valid response', async () => {
    mockRestGET.mockResolvedValue({ data: connection });

    await expect(
      getConnection('')({}, 'test-project', '550e8400-e29b-41d4-a716-446655440001'),
    ).resolves.toEqual(connection);
  });

  it('should pass the connection id and request options to restGET', async () => {
    const opts = { signal: new AbortController().signal };
    mockRestGET.mockResolvedValue({ data: connection });

    await getConnection('/data-connect-hub')(
      opts,
      'test-project',
      '550e8400-e29b-41d4-a716-446655440002',
    );

    expect(mockRestGET).toHaveBeenCalledWith(
      '/data-connect-hub',
      '/data-connect-hub/api/v1/connections/550e8400-e29b-41d4-a716-446655440002',
      { namespace: 'test-project' },
      opts,
    );
  });

  it.each([
    ['a non-mod-arch response', false, { data: connection }],
    ['missing response data', true, { data: undefined }],
    ['an invalid connection', true, { data: { metadata: {}, resource: {} } }],
  ])('should reject %s', async (_description, isResponse, response) => {
    mockIsModArchResponse.mockReturnValue(isResponse);
    mockRestGET.mockResolvedValue(response);

    await expect(
      getConnection('')({}, 'test-project', '550e8400-e29b-41d4-a716-446655440001'),
    ).rejects.toThrow('Invalid response format');
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
        data_connection_type_id: '550e8400-e29b-41d4-a716-446655440003',
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
        data_connection_type_id: '550e8400-e29b-41d4-a716-446655440003',
        credentials: { URI: 'valid' },
      }),
    ).resolves.toBeUndefined();
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  });
});
