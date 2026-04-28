/* eslint-disable camelcase */
import { handleRestFailures, restGET, type UserSettings } from 'mod-arch-core';
import {
  getUser,
  getNamespaces,
  getSecrets,
  getLlamaStackModels,
  getLlamaStackVectorStores,
} from '~/app/api/k8s';
import type {
  LlamaStackModelsResponse,
  LlamaStackVectorStoreProvidersResponse,
  NamespaceKind,
  SecretListItem,
} from '~/app/types';

// Mock dependencies
jest.mock('mod-arch-core', () => ({
  handleRestFailures: jest.fn(),
  restGET: jest.fn(),
  isModArchResponse: jest.fn((response) => response && 'data' in response),
  asEnumMember: jest.fn(),
  DeploymentMode: { Federated: 'Federated', Standalone: 'Standalone' },
}));

const mockHandleRestFailures = jest.mocked(handleRestFailures);
const mockRestGET = jest.mocked(restGET);

describe('k8s API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUser', () => {
    const mockUser: UserSettings = {
      userId: 'test-user',
      clusterAdmin: false,
    };

    it('should fetch user settings', async () => {
      const mockResponse = {
        data: mockUser,
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      const result = await getUser('')({});

      expect(mockRestGET).toHaveBeenCalledWith('', '/autorag/api/v1/user', {}, {});
      expect(result).toEqual(mockUser);
    });

    it('should throw error for invalid response format', async () => {
      mockHandleRestFailures.mockResolvedValue(null);

      await expect(getUser('')({})).rejects.toThrow('Invalid response format');
    });

    it('should pass API options to restGET', async () => {
      const mockResponse = {
        data: mockUser,
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      const apiOptions = { signal: new AbortController().signal };
      await getUser('')(apiOptions);

      expect(mockRestGET).toHaveBeenCalledWith('', '/autorag/api/v1/user', {}, apiOptions);
    });
  });

  describe('getNamespaces', () => {
    const mockNamespaces: NamespaceKind[] = [
      {
        name: 'namespace-1',
        displayName: 'Namespace 1',
      },
      {
        name: 'namespace-2',
        displayName: 'Namespace 2',
      },
    ];

    it('should fetch namespaces', async () => {
      const mockResponse = {
        data: mockNamespaces,
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      const result = await getNamespaces('')({});

      expect(mockRestGET).toHaveBeenCalledWith('', '/autorag/api/v1/namespaces', {}, {});
      expect(result).toEqual(mockNamespaces);
    });

    it('should throw error for invalid response format', async () => {
      mockHandleRestFailures.mockResolvedValue(null);

      await expect(getNamespaces('')({})).rejects.toThrow('Invalid response format');
    });

    it('should pass API options to restGET', async () => {
      const mockResponse = {
        data: mockNamespaces,
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      const apiOptions = { signal: new AbortController().signal };
      await getNamespaces('')(apiOptions);

      expect(mockRestGET).toHaveBeenCalledWith('', '/autorag/api/v1/namespaces', {}, apiOptions);
    });
  });

  describe('getSecrets', () => {
    const mockSecrets: SecretListItem[] = [
      {
        uuid: 'secret-uuid-1',
        name: 'secret-1',
        type: 'storage',
        data: { key1: 'value1', key2: 'value2' },
      },
      {
        uuid: 'secret-uuid-2',
        name: 'secret-2',
        type: 'lls',
        data: { 'api-key': 'value' },
      },
    ];

    it('should fetch all secrets without type filter', async () => {
      const mockResponse = {
        data: mockSecrets,
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      const result = await getSecrets('')('test-namespace')({});

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/secrets',
        { namespace: 'test-namespace' },
        {},
      );
      expect(result).toEqual(mockSecrets);
    });

    it('should fetch storage secrets when type is storage', async () => {
      const mockResponse = {
        data: [mockSecrets[0]],
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      const result = await getSecrets('')('test-namespace', 'storage')({});

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/secrets',
        {
          namespace: 'test-namespace',
          type: 'storage',
        },
        {},
      );
      expect(result).toEqual([mockSecrets[0]]);
    });

    it('should fetch lls secrets when type is lls', async () => {
      const mockResponse = {
        data: [mockSecrets[1]],
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      const result = await getSecrets('')('test-namespace', 'lls')({});

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/secrets',
        {
          namespace: 'test-namespace',
          type: 'lls',
        },
        {},
      );
      expect(result).toEqual([mockSecrets[1]]);
    });

    it('should throw error for invalid response format', async () => {
      mockHandleRestFailures.mockResolvedValue(null);

      await expect(getSecrets('')('test-namespace')({})).rejects.toThrow('Invalid response format');
    });

    it('should pass API options to restGET', async () => {
      const mockResponse = {
        data: mockSecrets,
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      const apiOptions = { signal: new AbortController().signal };
      await getSecrets('')('test-namespace')(apiOptions);

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/secrets',
        { namespace: 'test-namespace' },
        apiOptions,
      );
    });
  });

  describe('getLlamaStackModels', () => {
    const mockModelsResponse: LlamaStackModelsResponse = {
      models: [
        {
          id: 'model-1',
          type: 'llm',
          provider: 'openai',
          resource_path: '/models/model-1',
        },
        {
          id: 'model-2',
          type: 'embedding',
          provider: 'huggingface',
          resource_path: '/models/model-2',
        },
      ],
    };

    it('should fetch llama stack models', async () => {
      const mockResponse = {
        data: mockModelsResponse,
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      const result = await getLlamaStackModels('')('test-namespace', 'test-secret')({});

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/lsd/models',
        {
          namespace: 'test-namespace',
          secretName: 'test-secret',
        },
        {},
      );
      expect(result).toEqual(mockModelsResponse);
    });

    it('should throw error for invalid response format', async () => {
      mockHandleRestFailures.mockResolvedValue(null);

      await expect(getLlamaStackModels('')('test-namespace', 'test-secret')({})).rejects.toThrow(
        'Invalid response format',
      );
    });

    it('should pass API options to restGET', async () => {
      const mockResponse = {
        data: mockModelsResponse,
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      const apiOptions = { signal: new AbortController().signal };
      await getLlamaStackModels('')('test-namespace', 'test-secret')(apiOptions);

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/lsd/models',
        {
          namespace: 'test-namespace',
          secretName: 'test-secret',
        },
        apiOptions,
      );
    });
  });

  describe('getLlamaStackVectorStores', () => {
    const mockVectorStoresResponse: LlamaStackVectorStoreProvidersResponse = {
      vector_store_providers: [
        {
          provider_id: 'provider-1',
          provider_type: 'chromadb',
        },
        {
          provider_id: 'provider-2',
          provider_type: 'faiss',
        },
      ],
    };

    it('should fetch llama stack vector stores', async () => {
      const mockResponse = {
        data: mockVectorStoresResponse,
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      const result = await getLlamaStackVectorStores('')('test-namespace', 'test-secret')({});

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/lsd/vector-stores',
        {
          namespace: 'test-namespace',
          secretName: 'test-secret',
        },
        {},
      );
      expect(result).toEqual(mockVectorStoresResponse);
    });

    it('should throw error for invalid response format', async () => {
      mockHandleRestFailures.mockResolvedValue(null);

      await expect(
        getLlamaStackVectorStores('')('test-namespace', 'test-secret')({}),
      ).rejects.toThrow('Invalid response format');
    });

    it('should pass API options to restGET', async () => {
      const mockResponse = {
        data: mockVectorStoresResponse,
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      const apiOptions = { signal: new AbortController().signal };
      await getLlamaStackVectorStores('')('test-namespace', 'test-secret')(apiOptions);

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/lsd/vector-stores',
        {
          namespace: 'test-namespace',
          secretName: 'test-secret',
        },
        apiOptions,
      );
    });
  });
});
