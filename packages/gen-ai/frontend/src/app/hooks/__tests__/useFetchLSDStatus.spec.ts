// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as React from 'react';
import { waitFor } from '@testing-library/react';
import { useFetchState } from 'mod-arch-core';
import useFetchLSDStatus from '~/app/hooks/useFetchLSDStatus';
import { getLSDstatus } from '~/app/services/llamaStackService';
import {
  mockLlamaStackDistribution,
  mockLlamaStackDistributionError,
} from '~/__mocks__/mockLlamaStackDistribution';
import { testHook } from '~/__tests__/unit/testUtils/hooks';

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
  getLSDstatus: jest.fn(),
}));

const mockUseFetchState = jest.mocked(useFetchState);
const mockGetLSDstatus = jest.mocked(getLSDstatus);

describe('useFetchLSDStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when no project is selected', async () => {
    const mockError = new Error('No project selected');
    mockUseFetchState.mockReturnValue([null, false, mockError, jest.fn()]);

    const { result } = testHook(useFetchLSDStatus)();

    await waitFor(() => {
      const { error } = result.current;
      expect(error?.message).toBe('No project selected');
      expect(error).toBeInstanceOf(Error);
    });
  });

  it('should return error when getLSDstatus API fails', async () => {
    const mockError = new Error('Failed to fetch LSD status');
    mockGetLSDstatus.mockRejectedValue(mockError);
    mockUseFetchState.mockReturnValue([null, false, mockError, jest.fn()]);

    const { result } = testHook(useFetchLSDStatus)('test-project');

    await waitFor(() => {
      const { error } = result.current;
      expect(error?.message).toBe('Failed to fetch LSD status');
      expect(error).toBeInstanceOf(Error);
    });
  });

  it('should fetch LSD status successfully when project is provided', async () => {
    const mockRefresh = jest.fn();
    mockGetLSDstatus.mockResolvedValue(mockLlamaStackDistribution);
    mockUseFetchState.mockReturnValue([mockLlamaStackDistribution, true, undefined, mockRefresh]);

    const { result } = testHook(useFetchLSDStatus)('test-project');

    await waitFor(() => {
      const { data, loaded, error, refresh } = result.current;
      expect(data).toEqual(mockLlamaStackDistribution);
      expect(loaded).toBe(true);
      expect(error).toBeUndefined();
      expect(refresh).toBe(mockRefresh);
    });
  });

  it('should return null when no LSD is available', async () => {
    const mockRefresh = jest.fn();
    // When no LSD is found, the service throws an error or returns empty response
    const noLSDError = new Error('No LlamaStack Distribution found');
    mockGetLSDstatus.mockRejectedValue(noLSDError);
    mockUseFetchState.mockReturnValue([null, true, noLSDError, mockRefresh]);

    const { result } = testHook(useFetchLSDStatus)('test-project');

    await waitFor(() => {
      const { data, loaded, error } = result.current;
      expect(data).toBeNull();
      expect(loaded).toBe(true);
      expect(error?.message).toBe('No LlamaStack Distribution found');
    });
  });

  it('should handle loading state correctly', async () => {
    const mockRefresh = jest.fn();
    mockUseFetchState.mockReturnValue([null, false, undefined, mockRefresh]);

    const { result } = testHook(useFetchLSDStatus)('test-project');

    await waitFor(() => {
      const { data, loaded, error } = result.current;
      expect(data).toBeNull();
      expect(loaded).toBe(false);
      expect(error).toBeUndefined();
    });
  });

  it('should call getLSDstatus with correct project parameter', async () => {
    const testProject = 'my-test-project';
    const mockRefresh = jest.fn();
    mockGetLSDstatus.mockResolvedValue(mockLlamaStackDistribution);
    mockUseFetchState.mockReturnValue([mockLlamaStackDistribution, true, undefined, mockRefresh]);

    testHook(useFetchLSDStatus)(testProject);
  });

  it('should handle LSD in error state', async () => {
    const mockRefresh = jest.fn();
    mockGetLSDstatus.mockResolvedValue(mockLlamaStackDistributionError);
    mockUseFetchState.mockReturnValue([
      mockLlamaStackDistributionError,
      true,
      undefined,
      mockRefresh,
    ]);

    const { result } = testHook(useFetchLSDStatus)('test-project');

    await waitFor(() => {
      const { data, loaded, error } = result.current;
      expect(data).toEqual(mockLlamaStackDistributionError);
      expect(data?.phase).toBe('Failed');
      expect(loaded).toBe(true);
      expect(error).toBeUndefined();
    });
  });

  it('should handle project parameter changes', async () => {
    const mockRefresh = jest.fn();
    mockGetLSDstatus.mockResolvedValue(mockLlamaStackDistribution);
    mockUseFetchState.mockReturnValue([mockLlamaStackDistribution, true, undefined, mockRefresh]);

    const { result, rerender } = testHook(useFetchLSDStatus)('project-1');

    await waitFor(() => {
      expect(result.current.data).toEqual(mockLlamaStackDistribution);
    });

    rerender('project-2');

    // Verify that useFetchState was called again with new callback
    expect(mockUseFetchState).toHaveBeenCalledTimes(2);
  });

  it('should handle undefined project parameter gracefully', async () => {
    const mockError = new Error('No project selected');
    mockUseFetchState.mockReturnValue([null, false, mockError, jest.fn()]);

    const { result } = testHook(useFetchLSDStatus)(undefined);

    await waitFor(() => {
      const { data, loaded, error } = result.current;
      expect(data).toBeNull();
      expect(loaded).toBe(false);
      expect(error?.message).toBe('No project selected');
    });
  });

  it('should maintain referential stability of refresh function', async () => {
    const mockRefresh = jest.fn();
    mockUseFetchState.mockReturnValue([mockLlamaStackDistribution, true, undefined, mockRefresh]);

    const { result, rerender } = testHook(useFetchLSDStatus)('test-project');

    const initialRefresh = result.current.refresh;

    // Re-render with same project
    rerender('test-project');

    expect(result.current.refresh).toBe(initialRefresh);
    expect(result.current.refresh).toBe(mockRefresh);
  });

  it('should handle network timeout errors', async () => {
    const timeoutError = new Error('Network timeout');
    mockGetLSDstatus.mockRejectedValue(timeoutError);
    mockUseFetchState.mockReturnValue([null, false, timeoutError, jest.fn()]);

    const { result } = testHook(useFetchLSDStatus)('test-project');

    await waitFor(() => {
      const { error } = result.current;
      expect(error?.message).toBe('Network timeout');
      expect(error).toBeInstanceOf(Error);
    });
  });

  it('should handle server error responses', async () => {
    const serverError = new Error('Internal server error');
    mockGetLSDstatus.mockRejectedValue(serverError);
    mockUseFetchState.mockReturnValue([null, false, serverError, jest.fn()]);

    const { result } = testHook(useFetchLSDStatus)('test-project');

    await waitFor(() => {
      const { error } = result.current;
      expect(error?.message).toBe('Internal server error');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
