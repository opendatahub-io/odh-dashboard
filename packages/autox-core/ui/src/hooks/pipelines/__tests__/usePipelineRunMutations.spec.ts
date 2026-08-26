import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { createPipelineRunMutations } from '../usePipelineRunMutations';

const createWrapper = () => {
  const queryClient = new QueryClient();
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('createPipelineRunMutations', () => {
  const {
    useTerminatePipelineRunMutation,
    useRetryPipelineRunMutation,
    useDeletePipelineRunMutation,
  } = createPipelineRunMutations('/test-product', 'v1');

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  describe('useTerminatePipelineRunMutation', () => {
    it('should POST to the terminate endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useTerminatePipelineRunMutation('ns', 'run-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate();
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(global.fetch).toHaveBeenCalledWith(
        '/test-product/api/v1/pipeline-runs/run-1/terminate?namespace=ns',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should throw with the server error message on failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ error: { message: 'boom' } }),
      });

      const { result } = renderHook(() => useTerminatePipelineRunMutation('ns', 'run-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate();
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error?.message).toBe('Failed to terminate run (500): boom');
    });
  });

  describe('useRetryPipelineRunMutation', () => {
    it('should POST to the retry endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useRetryPipelineRunMutation('ns', 'run-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate();
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(global.fetch).toHaveBeenCalledWith(
        '/test-product/api/v1/pipeline-runs/run-1/retry?namespace=ns',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('useDeletePipelineRunMutation', () => {
    it('should DELETE the run', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useDeletePipelineRunMutation('ns', 'run-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate();
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(global.fetch).toHaveBeenCalledWith(
        '/test-product/api/v1/pipeline-runs/run-1?namespace=ns',
        { method: 'DELETE' },
      );
    });

    it('should throw with the server error message on failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'plain text error',
      });

      const { result } = renderHook(() => useDeletePipelineRunMutation('ns', 'run-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate();
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error?.message).toBe('Failed to delete run (400): plain text error');
    });
  });
});
