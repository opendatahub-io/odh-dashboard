/* eslint-disable camelcase -- PipelineRun type uses snake_case */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import type { PipelineRun, PipelinesApi } from '../../../api/pipelines';
import { useAutoXApi } from '../../../context';
import { useCreatePipelineRunMutation } from '../useCreatePipelineRunMutation';

jest.mock('../../../context', () => ({
  useAutoXApi: jest.fn(),
}));

const useAutoXApiMock = jest.mocked(useAutoXApi);

const mockPipelineRun: PipelineRun = {
  run_id: 'run-1',
  display_name: 'Run 1',
  created_at: '2026-01-01',
  state: 'RUNNING',
};

const createWrapper = () => {
  const queryClient = new QueryClient();
  const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe('useCreatePipelineRunMutation', () => {
  const createPipelineRun = jest.fn<
    ReturnType<PipelinesApi['createPipelineRun']>,
    Parameters<PipelinesApi['createPipelineRun']>
  >();

  beforeEach(() => {
    jest.clearAllMocks();
    useAutoXApiMock.mockReturnValue({ pipelines: { createPipelineRun } } as unknown as ReturnType<
      typeof useAutoXApi
    >);
  });

  it('should create a pipeline run through the shared client and select the response', async () => {
    createPipelineRun.mockResolvedValue(mockPipelineRun);
    const select = jest.fn((run: PipelineRun) => run.run_id);
    const payload = { display_name: 'Run 1' };
    const { result } = renderHook(() => useCreatePipelineRunMutation('my-namespace', select), {
      wrapper: createWrapper(),
    });

    let response: string | undefined;
    await act(async () => {
      response = await result.current.mutateAsync(payload);
    });

    expect(createPipelineRun).toHaveBeenCalledWith('', 'my-namespace', payload);
    expect(select).toHaveBeenCalledWith(mockPipelineRun);
    expect(response).toBe('run-1');
  });
});
