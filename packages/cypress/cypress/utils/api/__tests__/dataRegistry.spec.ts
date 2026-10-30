import { beforeEach, describe, expect as assert, it, jest } from '@jest/globals';
import {
  deleteDataRegistryAsset,
  seedDataRegistryBrowseAsset,
  waitForDataRegistryProjectCollectionsApi,
} from '../dataRegistry';

type CypressMock = {
  location: ReturnType<typeof jest.fn>;
  request: ReturnType<typeof jest.fn>;
  task: ReturnType<typeof jest.fn>;
  wrap: ReturnType<typeof jest.fn>;
  wait: ReturnType<typeof jest.fn>;
  log: ReturnType<typeof jest.fn>;
};

const cyMock: CypressMock = {
  location: jest.fn(),
  request: jest.fn(),
  task: jest.fn(),
  wrap: jest.fn(),
  wait: jest.fn(),
  log: jest.fn(),
};

const apiResponse = (status: number, body: unknown) => ({ status, body, headers: {} });

const cypressExpect = (actual: unknown) => ({
  to: {
    equal(expected: unknown) {
      assert(actual).toBe(expected);
    },
    include(expected: unknown) {
      assert(actual).toContain(expected);
    },
  },
});

describe('Data Registry API helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cyMock.location.mockResolvedValue('https://dashboard.example');
    cyMock.wrap.mockImplementation((value: unknown) => Promise.resolve(value));
    cyMock.wait.mockResolvedValue(undefined);
    Object.defineProperty(globalThis, 'cy', { configurable: true, value: cyMock });
    Object.defineProperty(globalThis, 'expect', { configurable: true, value: cypressExpect });
  });

  describe('seedDataRegistryBrowseAsset', () => {
    const project = 'test-project';
    const collection = 'test-collection';
    const asset = 'browse-asset';

    it('should reuse an existing asset without claiming it was created', async () => {
      const onCreated = jest.fn();
      cyMock.request
        .mockResolvedValueOnce(apiResponse(200, { name: asset }))
        .mockResolvedValueOnce(apiResponse(200, { name: asset }))
        .mockResolvedValueOnce(apiResponse(200, { assets: [{ name: asset }] }));

      await assert(
        seedDataRegistryBrowseAsset(project, collection, asset, onCreated),
      ).resolves.toBe(false);

      assert(onCreated).not.toHaveBeenCalled();
      assert(cyMock.request).toHaveBeenCalledTimes(3);
      assert(cyMock.request.mock.calls[0][0]).toMatchObject({ method: 'GET' });
    });

    it('should treat a creation conflict as reuse and verify the asset is available', async () => {
      const onCreated = jest.fn();
      cyMock.request
        .mockResolvedValueOnce(apiResponse(404, {}))
        .mockResolvedValueOnce(apiResponse(409, { message: 'already exists' }))
        .mockResolvedValueOnce(apiResponse(200, { name: asset }))
        .mockResolvedValueOnce(apiResponse(200, { assets: [{ name: asset }] }));

      await assert(
        seedDataRegistryBrowseAsset(project, collection, asset, onCreated),
      ).resolves.toBe(false);

      assert(onCreated).not.toHaveBeenCalled();
      assert(cyMock.request).toHaveBeenCalledTimes(4);
      assert(cyMock.request.mock.calls[1][0]).toMatchObject({ method: 'POST' });
    });

    it('should report creation and call onCreated before checking availability', async () => {
      const onCreated = jest.fn();
      cyMock.request
        .mockResolvedValueOnce(apiResponse(404, {}))
        .mockResolvedValueOnce(apiResponse(201, { name: asset }))
        .mockResolvedValueOnce(apiResponse(200, { name: asset }))
        .mockResolvedValueOnce(apiResponse(200, { assets: [{ name: asset }] }));

      await assert(
        seedDataRegistryBrowseAsset(project, collection, asset, onCreated),
      ).resolves.toBe(true);

      assert(onCreated).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteDataRegistryAsset', () => {
    it('should treat an already-absent resource as successfully cleaned up', async () => {
      cyMock.task.mockResolvedValue({ response: { status: 404, body: undefined, headers: {} } });

      await assert(
        deleteDataRegistryAsset('project', 'collection', 'asset', { continueOnError: true }),
      ).resolves.toBe(false);
    });

    it('should return a token failure so teardown can continue with other cleanup', async () => {
      cyMock.task.mockResolvedValue({ tokenError: 'oc is not logged in' });

      await assert(
        deleteDataRegistryAsset('project', 'collection', 'asset', { continueOnError: true }),
      ).resolves.toContain('Failed to get OC token');
    });

    it('should return a transport failure so teardown can continue with other cleanup', async () => {
      cyMock.task.mockResolvedValue({ transportError: 'connection reset' });

      await assert(
        deleteDataRegistryAsset('project', 'collection', 'asset', { continueOnError: true }),
      ).resolves.toContain('connection reset');
    });

    it('should reject a failed DELETE when cleanup is not best-effort', async () => {
      cyMock.task.mockResolvedValue({ response: { status: 500, body: 'failed', headers: {} } });

      await assert(deleteDataRegistryAsset('project', 'collection', 'asset')).rejects.toThrow(
        'Failed to delete Data Registry asset',
      );
    });
  });

  describe('waitForDataRegistryProjectCollectionsApi', () => {
    it('should return once the project collections endpoint responds successfully', async () => {
      cyMock.request.mockResolvedValue(apiResponse(200, { namespaces: [] }));

      await assert(waitForDataRegistryProjectCollectionsApi('project')).resolves.toBeUndefined();

      assert(cyMock.request).toHaveBeenCalledTimes(1);
      assert(cyMock.wait).not.toHaveBeenCalled();
    });

    it('should retry a failed response and stop once the API becomes ready', async () => {
      cyMock.request
        .mockResolvedValueOnce(apiResponse(503, { error: 'starting' }))
        .mockResolvedValueOnce(apiResponse(200, { namespaces: [] }));

      await assert(waitForDataRegistryProjectCollectionsApi('project')).resolves.toBeUndefined();

      assert(cyMock.request).toHaveBeenCalledTimes(2);
      assert(cyMock.wait).toHaveBeenCalledTimes(1);
    });

    it('should fail after the configured retry bound', async () => {
      cyMock.request.mockResolvedValue(apiResponse(503, { error: 'unavailable' }));

      await assert(waitForDataRegistryProjectCollectionsApi('project')).rejects.toThrow(
        'after 12 attempts',
      );

      assert(cyMock.request).toHaveBeenCalledTimes(12);
      assert(cyMock.wait).toHaveBeenCalledTimes(11);
    });
  });
});
