// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as React from 'react';
import { useFetchState } from 'mod-arch-core';
import useModelVersionsByRegisteredModel from '~/app/hooks/useModelVersionsByRegisteredModel';
import { useModelRegistryAPI } from '~/app/hooks/useModelRegistryAPI';
import { ModelRegistryAPIs } from '~/app/types';
import { mockModelVersion } from '~/__mocks__/mockModelVersion';
import { testHook } from '~/__tests__/unit/testUtils/hooks';

jest.mock('mod-arch-core', () => ({
  useFetchState: jest.fn(),
  NotReadyError: class NotReadyError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NotReadyError';
    }
  },
}));

global.fetch = jest.fn();

jest.mock('~/app/hooks/useModelRegistryAPI', () => ({
  useModelRegistryAPI: jest.fn(),
}));

const mockUseModelRegistryAPI = jest.mocked(useModelRegistryAPI);
const mockUseFetchState = jest.mocked(useFetchState);

const mockModelRegistryAPIs: ModelRegistryAPIs = {
  createRegisteredModel: jest.fn(),
  createModelVersionForRegisteredModel: jest.fn(),
  createModelArtifactForModelVersion: jest.fn(),
  getRegisteredModel: jest.fn(),
  getModelVersion: jest.fn(),
  listModelVersions: jest.fn(),
  listRegisteredModels: jest.fn(),
  getModelVersionsByRegisteredModel: jest.fn(),
  getModelArtifactsByModelVersion: jest.fn(),
  patchRegisteredModel: jest.fn(),
  patchModelVersion: jest.fn(),
  patchModelArtifact: jest.fn(),
  listModelTransferJobs: jest.fn(),
  getModelTransferJobByName: jest.fn(),
  createModelTransferJob: jest.fn(),
  updateModelTransferJob: jest.fn(),
  deleteModelTransferJob: jest.fn(),
  getModelTransferJobEvents: jest.fn(),
};

const captureCallback = (): ((opts: unknown) => Promise<unknown>) => {
  mockUseFetchState.mockReturnValue([
    { items: [], size: 0, pageSize: 0, nextPageToken: '' },
    false,
    undefined,
    jest.fn(),
  ]);
  return mockUseFetchState.mock.calls[0][0] as (opts: unknown) => Promise<unknown>;
};

describe('useModelVersionsByRegisteredModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject with NotReadyError if API is not available', async () => {
    mockUseModelRegistryAPI.mockReturnValue({
      api: mockModelRegistryAPIs,
      apiAvailable: false,
      refreshAllAPI: jest.fn(),
    });

    testHook(useModelVersionsByRegisteredModel)('model-1');
    const callback = captureCallback();

    await expect(callback({})).rejects.toThrow('API not yet available');
    await expect(callback({})).rejects.toMatchObject({ name: 'NotReadyError' });
  });

  it('should reject with NotReadyError when registeredModelId is not provided', async () => {
    mockUseModelRegistryAPI.mockReturnValue({
      api: mockModelRegistryAPIs,
      apiAvailable: true,
      refreshAllAPI: jest.fn(),
    });

    testHook(useModelVersionsByRegisteredModel)();
    const callback = captureCallback();

    await expect(callback({})).rejects.toThrow('No model registeredModel id');
    await expect(callback({})).rejects.toMatchObject({ name: 'NotReadyError' });
  });

  it('should call api.getModelVersionsByRegisteredModel with the correct id', async () => {
    const mockResponse = {
      items: [mockModelVersion({ id: 'v-1' })],
      size: 1,
      pageSize: 1,
      nextPageToken: '',
    };
    const getModelVersionsByRegisteredModelMock = jest.fn().mockResolvedValue(mockResponse);

    mockUseModelRegistryAPI.mockReturnValue({
      api: {
        ...mockModelRegistryAPIs,
        getModelVersionsByRegisteredModel: getModelVersionsByRegisteredModelMock,
      },
      apiAvailable: true,
      refreshAllAPI: jest.fn(),
    });

    testHook(useModelVersionsByRegisteredModel)('model-1');
    const callback = captureCallback();

    const result = await callback({});

    expect(getModelVersionsByRegisteredModelMock).toHaveBeenCalledWith({}, 'model-1');
    expect(result).toEqual(mockResponse);
  });
});
