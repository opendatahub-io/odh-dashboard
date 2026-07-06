/* eslint-disable camelcase */
import * as modArchCore from 'mod-arch-core';
import type {
  APIKey,
  APIKeyListResponse,
  BulkRevokeResponse,
  CreateAPIKeyResponse,
} from '~/app/types/api-key';
import { bulkRevokeApiKeys, createApiKey, revokeApiKey, searchApiKeys } from '~/app/api/api-keys';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  handleRestFailures: jest.fn((p: Promise<unknown>) => p),
  restCREATE: jest.fn(),
  restDELETE: jest.fn(),
  assembleModArchBody: jest.fn((body: unknown) => ({ data: body })),
}));

const mockRestCREATE = jest.mocked(modArchCore.restCREATE);
const mockRestDELETE = jest.mocked(modArchCore.restDELETE);
const mockHandleRestFailures = jest.mocked(modArchCore.handleRestFailures);

const validKey: APIKey = {
  id: 'key-1',
  name: 'My Key',
  status: 'active',
  creationDate: '2025-01-01T00:00:00Z',
};

const validListResponse: APIKeyListResponse = {
  object: 'list',
  data: [validKey],
  has_more: false,
  subscriptionDetails: {
    'premium-sub': { displayName: 'Premium', models: ['granite-3-8b-instruct'] },
  },
};

describe('searchApiKeys', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((p: Promise<unknown>) => p);
  });

  it('should resolve with a valid API key list response', async () => {
    mockRestCREATE.mockResolvedValue({ data: validListResponse });

    const result = await searchApiKeys()({} as never);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('key-1');
    expect(result.has_more).toBe(false);
  });

  it('should accept a response with no subscriptionDetails field', async () => {
    const withoutDetails: Omit<APIKeyListResponse, 'subscriptionDetails'> = {
      object: validListResponse.object,
      data: validListResponse.data,
      has_more: validListResponse.has_more,
    };
    mockRestCREATE.mockResolvedValue({ data: withoutDetails });

    const result = await searchApiKeys()({} as never);
    expect(result.subscriptionDetails).toBeUndefined();
  });

  it('should throw when any API key is missing status', async () => {
    const keyMissingStatus = { id: 'key-1', name: 'My Key', creationDate: '2025-01-01' };
    mockRestCREATE.mockResolvedValue({
      data: { ...validListResponse, data: [keyMissingStatus] },
    });

    await expect(searchApiKeys()({} as never)).rejects.toThrow('Invalid response format');
  });

  it('should throw when any API key is missing id', async () => {
    const keyMissingId = { name: 'My Key', status: 'active', creationDate: '2025-01-01' };
    mockRestCREATE.mockResolvedValue({
      data: { ...validListResponse, data: [keyMissingId] },
    });

    await expect(searchApiKeys()({} as never)).rejects.toThrow('Invalid response format');
  });

  it('should throw when has_more is missing from the response', async () => {
    const withoutHasMore = {
      object: validListResponse.object,
      data: validListResponse.data,
      subscriptionDetails: validListResponse.subscriptionDetails,
    };
    mockRestCREATE.mockResolvedValue({ data: withoutHasMore });

    await expect(searchApiKeys()({} as never)).rejects.toThrow('Invalid response format');
  });

  it('should throw when response is not mod-arch wrapped', async () => {
    mockRestCREATE.mockResolvedValue(validListResponse);

    await expect(searchApiKeys()({} as never)).rejects.toThrow('Invalid response format');
  });
});

describe('createApiKey', () => {
  const validCreateResponse: CreateAPIKeyResponse = {
    key: 'sk-abc123',
    keyPrefix: 'sk-',
    id: 'key-new',
    name: 'New Key',
    createdAt: '2025-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((p: Promise<unknown>) => p);
  });

  it('should resolve with create response for a valid response', async () => {
    mockRestCREATE.mockResolvedValue({ data: validCreateResponse });

    const result = await createApiKey()({} as never, {
      name: 'New Key',
      subscription: 'premium-sub',
    });
    expect(result.id).toBe('key-new');
    expect(result.key).toBe('sk-abc123');
  });

  it('should accept an optional expiresAt field', async () => {
    mockRestCREATE.mockResolvedValue({
      data: { ...validCreateResponse, expiresAt: '2026-01-01T00:00:00Z' },
    });

    const result = await createApiKey()({} as never, { name: 'New Key', subscription: 'sub' });
    expect(result.expiresAt).toBe('2026-01-01T00:00:00Z');
  });

  it('should throw when the key field is missing', async () => {
    const missingKey = {
      keyPrefix: validCreateResponse.keyPrefix,
      id: validCreateResponse.id,
      name: validCreateResponse.name,
      createdAt: validCreateResponse.createdAt,
    };
    mockRestCREATE.mockResolvedValue({ data: missingKey });

    await expect(
      createApiKey()({} as never, { name: 'New Key', subscription: 'sub' }),
    ).rejects.toThrow('Invalid response format');
  });

  it('should throw when response is not mod-arch wrapped', async () => {
    mockRestCREATE.mockResolvedValue(validCreateResponse);

    await expect(
      createApiKey()({} as never, { name: 'New Key', subscription: 'sub' }),
    ).rejects.toThrow('Invalid response format');
  });
});

describe('bulkRevokeApiKeys', () => {
  const validBulkRevokeResponse: BulkRevokeResponse = {
    revokedCount: 3,
    message: '3 API keys revoked successfully',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((p: Promise<unknown>) => p);
  });

  it('should resolve with revoke count and message', async () => {
    mockRestCREATE.mockResolvedValue({ data: validBulkRevokeResponse });

    const result = await bulkRevokeApiKeys()({} as never, 'user@example.com');
    expect(result.revokedCount).toBe(3);
    expect(result.message).toBe('3 API keys revoked successfully');
  });

  it('should accept a zero revoke count', async () => {
    mockRestCREATE.mockResolvedValue({ data: { revokedCount: 0, message: 'Nothing to revoke' } });

    const result = await bulkRevokeApiKeys()({} as never, 'user@example.com');
    expect(result.revokedCount).toBe(0);
  });

  it('should throw when revokedCount is missing', async () => {
    mockRestCREATE.mockResolvedValue({ data: { message: 'ok' } });

    await expect(bulkRevokeApiKeys()({} as never, 'user@example.com')).rejects.toThrow(
      'Invalid response format',
    );
  });

  it('should throw when response is not mod-arch wrapped', async () => {
    mockRestCREATE.mockResolvedValue(validBulkRevokeResponse);

    await expect(bulkRevokeApiKeys()({} as never, 'user@example.com')).rejects.toThrow(
      'Invalid response format',
    );
  });
});

describe('revokeApiKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((p: Promise<unknown>) => p);
  });

  it('should resolve with the revoked API key', async () => {
    mockRestDELETE.mockResolvedValue({ data: validKey });

    const result = await revokeApiKey()({} as never, 'key-1');
    expect(result.id).toBe('key-1');
    expect(result.status).toBe('active');
  });

  it('should throw when the revoked key is missing status', async () => {
    const missingStatus = {
      id: validKey.id,
      name: validKey.name,
      creationDate: validKey.creationDate,
    };
    mockRestDELETE.mockResolvedValue({ data: missingStatus });

    await expect(revokeApiKey()({} as never, 'key-1')).rejects.toThrow('Invalid response format');
  });

  it('should throw when response is not mod-arch wrapped', async () => {
    mockRestDELETE.mockResolvedValue(validKey);

    await expect(revokeApiKey()({} as never, 'key-1')).rejects.toThrow('Invalid response format');
  });
});
