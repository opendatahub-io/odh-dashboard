// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as React from 'react';
import { waitFor } from '@testing-library/react';
import { useFetchState } from 'mod-arch-core';
import useFetchLlamaModels from '~/app/hooks/useFetchLlamaModels';
import { getAAModels } from '~/app/services/llamaStackService';
import { mockLlamaModels } from '~/__mocks__/mockLlamaStackModels';
import { testHook } from '~/__tests__/unit/testUtils/hooks';

// Mock utilities/const to avoid asEnumMember error
jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/gen-ai',
  DEPLOYMENT_MODE: 'federated',
  MCP_SERVERS_SESSION_STORAGE_KEY: 'gen-ai-playground-servers',
}));

// Mock mod-arch-core to avoid React context issues
jest.mock('mod-arch-core', () => ({
  useFetchState: jest.fn(),
  NotReadyError: class NotReadyError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NotReadyError';
    }
  },
}));

// Mock the llamaStackService
jest.mock('~/app/services/llamaStackService', () => ({
  getAAModels: jest.fn(),
}));

const mockUseFetchState = jest.mocked(useFetchState);
const mockGetModels = jest.mocked(getAAModels);

describe('useFetchLlamaModels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when no project is selected', async () => {
    const mockError = new Error('No project selected');
    mockUseFetchState.mockReturnValue([[], false, mockError, jest.fn()]);

    const { result } = testHook(useFetchLlamaModels)();

    await waitFor(() => {
      const { error } = result.current;
      expect(error?.message).toBe('No project selected');
      expect(error).toBeInstanceOf(Error);
    });
  });

  it('should return error when getAAModels API fails', async () => {
    const mockError = new Error('Failed to fetch models');
    mockGetModels.mockReturnValue(jest.fn().mockRejectedValue(mockError));
    mockUseFetchState.mockReturnValue([[], false, mockError, jest.fn()]);

    const { result } = testHook(useFetchLlamaModels)();

    await waitFor(() => {
      const { error } = result.current;
      expect(error?.message).toBe('Failed to fetch models');
      expect(error).toBeInstanceOf(Error);
    });
  });

  it('should fetch Llama models successfully when project is provided', async () => {
    const mockRefresh = jest.fn();
    mockGetModels.mockReturnValue(jest.fn().mockResolvedValue(mockLlamaModels));
    mockUseFetchState.mockReturnValue([mockLlamaModels, true, undefined, mockRefresh]);

    const { result } = testHook(useFetchLlamaModels)();

    await waitFor(() => {
      const { data, loaded, error, refresh } = result.current;
      expect(data).toEqual(mockLlamaModels);
      expect(loaded).toBe(true);
      expect(error).toBeUndefined();
      expect(refresh).toBe(mockRefresh);
    });
  });

  it('should return empty array when no models are available', async () => {
    const mockRefresh = jest.fn();
    mockGetModels.mockReturnValue(jest.fn().mockResolvedValue([]));
    mockUseFetchState.mockReturnValue([[], true, undefined, mockRefresh]);

    const { result } = testHook(useFetchLlamaModels)();

    await waitFor(() => {
      const { data, loaded, error } = result.current;
      expect(data).toEqual([]);
      expect(loaded).toBe(true);
      expect(error).toBeUndefined();
    });
  });

  it('should handle loading state correctly', async () => {
    const mockRefresh = jest.fn();
    mockUseFetchState.mockReturnValue([[], false, undefined, mockRefresh]);

    const { result } = testHook(useFetchLlamaModels)();

    await waitFor(() => {
      const { data, loaded, error } = result.current;
      expect(data).toEqual([]);
      expect(loaded).toBe(false);
      expect(error).toBeUndefined();
    });
  });
});
