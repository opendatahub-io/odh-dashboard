import { waitFor } from '@testing-library/react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import axios from '#~/utilities/axios';
import useMlflowExperiments from '#~/concepts/mlflow/useMlflowExperiments';
import { MlflowExperiment } from '#~/concepts/mlflow/types';

jest.mock('#~/utilities/axios', () => ({
  get: jest.fn(),
}));

const mockAxios = jest.mocked(axios.get);

const mockExperiments: MlflowExperiment[] = [
  {
    id: '1',
    name: 'training-run',
    lifecycleStage: 'active',
    creationTime: '2026-01-01T00:00:00Z',
    lastUpdateTime: '2026-03-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'evaluation',
    lifecycleStage: 'active',
    creationTime: '2026-02-01T00:00:00Z',
    lastUpdateTime: '2026-03-10T00:00:00Z',
  },
];

describe('useMlflowExperiments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not fetch when workspace is empty', () => {
    const renderResult = testHook(useMlflowExperiments)({ workspace: '' });
    expect(renderResult.result.current.data).toEqual([]);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(mockAxios).not.toHaveBeenCalled();
  });

  it('should fetch experiments for the given workspace', async () => {
    mockAxios.mockResolvedValue({
      data: { data: { experiments: mockExperiments } },
    });

    const renderResult = testHook(useMlflowExperiments)({ workspace: 'test-ns-giulio' });

    await waitFor(() => {
      expect(renderResult.result.current.loaded).toBe(true);
    });

    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(mockAxios).toHaveBeenCalledWith('/mlflow/api/v1/experiments?workspace=test-ns-giulio');
    expect(renderResult.result.current.data).toEqual(mockExperiments);
    expect(renderResult.result.current.error).toBeUndefined();
  });

  it('should include filter parameter when provided', async () => {
    mockAxios.mockResolvedValue({
      data: { data: { experiments: [mockExperiments[0]] } },
    });

    const renderResult = testHook(useMlflowExperiments)({
      workspace: 'test-ns-giulio',
      filter: "tags.team = 'eval-hub'",
    });

    await waitFor(() => {
      expect(renderResult.result.current.loaded).toBe(true);
    });

    expect(mockAxios).toHaveBeenCalledTimes(1);
    const url = mockAxios.mock.calls[0][0];
    const params = new URL(url, 'http://localhost').searchParams;
    expect(params.get('workspace')).toBe('test-ns-giulio');
    expect(params.get('filter')).toBe("tags.team = 'eval-hub'");
    expect(renderResult.result.current.data).toHaveLength(1);
  });

  it('should handle API errors', async () => {
    const testError = new Error('Network error');
    mockAxios.mockRejectedValue(testError);

    const renderResult = testHook(useMlflowExperiments)({ workspace: 'test-ns-giulio' });

    await waitFor(() => {
      expect(renderResult.result.current.error).toBeDefined();
    });

    expect(renderResult.result.current.data).toEqual([]);
    expect(renderResult.result.current.error).toBe(testError);
  });

  it('should refetch when workspace changes', async () => {
    mockAxios.mockResolvedValue({
      data: { data: { experiments: mockExperiments } },
    });

    const renderResult = testHook(useMlflowExperiments)({ workspace: 'ns-1' });

    await waitFor(() => {
      expect(renderResult.result.current.loaded).toBe(true);
    });
    expect(mockAxios).toHaveBeenCalledWith('/mlflow/api/v1/experiments?workspace=ns-1');

    mockAxios.mockResolvedValue({
      data: { data: { experiments: [] } },
    });

    renderResult.rerender({ workspace: 'ns-2' });

    await waitFor(() => {
      expect(mockAxios).toHaveBeenLastCalledWith('/mlflow/api/v1/experiments?workspace=ns-2');
      expect(renderResult.result.current.loaded).toBe(true);
    });
    expect(renderResult.result.current.data).toEqual([]);
  });

  it('should refetch when filter changes', async () => {
    mockAxios.mockResolvedValue({
      data: { data: { experiments: mockExperiments } },
    });

    const renderResult = testHook(useMlflowExperiments)({ workspace: 'test-ns-giulio' });

    await waitFor(() => {
      expect(renderResult.result.current.loaded).toBe(true);
    });
    expect(mockAxios).toHaveBeenCalledTimes(1);

    mockAxios.mockResolvedValue({
      data: { data: { experiments: [mockExperiments[0]] } },
    });

    renderResult.rerender({ workspace: 'test-ns-giulio', filter: "name = 'training-run'" });

    await waitFor(() => {
      expect(renderResult.result.current.data).toHaveLength(1);
    });
    expect(mockAxios).toHaveBeenCalledTimes(2);
    const refetchUrl = mockAxios.mock.calls[1][0];
    const refetchParams = new URL(refetchUrl, 'http://localhost').searchParams;
    expect(refetchParams.get('workspace')).toBe('test-ns-giulio');
    expect(refetchParams.get('filter')).toBe("name = 'training-run'");
  });
});
