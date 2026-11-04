import { renderHook, waitFor, act } from '@testing-library/react';
import { getServingRuntime } from '@odh-dashboard/internal/api/k8s/servingRuntimes';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import type { ServingRuntimeKind } from '../../../shared';
import { mockInferenceServiceK8sResource } from '../../../__mocks__/mockInferenceServiceK8sResource';
import { mockServingRuntimeK8sResource } from '../../../__mocks__/mockServingRuntimeK8sResource';
import { mockNimServingRuntime } from '../../../__mocks__/mockLegacyNimResource';
import { useIsNIMModel } from '../useIsNIMModel';

jest.mock('@odh-dashboard/internal/api/k8s/servingRuntimes', () => ({
  getServingRuntime: jest.fn(),
}));
jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));
const mockGet = jest.mocked(getServingRuntime);
const setNIMEnabled = (status: boolean) =>
  jest.mocked(useIsAreaAvailable).mockReturnValue({
    status,
    devFlags: null,
    featureFlags: null,
    reliantAreas: null,
    requiredCapabilities: null,
    requiredComponents: null,
  });
const notNIM = { isNIMModel: false, loading: false, error: undefined };

describe('useIsNIMModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setNIMEnabled(true);
  });
  it('should fetch the referenced namespaced runtime and identify NIM', async () => {
    mockGet.mockResolvedValue(mockNimServingRuntime());
    const { result } = renderHook(() => useIsNIMModel(mockInferenceServiceK8sResource({})));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.isNIMModel).toBe(true));
    expect(result.current.loading).toBe(false);
    expect(mockGet).toHaveBeenCalledWith(
      'test-model',
      'test-project',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
  it('should return false for a plain KServe runtime', async () => {
    mockGet.mockResolvedValue(mockServingRuntimeK8sResource({}));
    const { result } = renderHook(() => useIsNIMModel(mockInferenceServiceK8sResource({})));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toEqual(notNIM);
  });
  it('should skip requests and return false when NIM functionality is disabled', async () => {
    setNIMEnabled(false);
    const { result } = renderHook(() => useIsNIMModel(mockInferenceServiceK8sResource({})));
    await act(async () => undefined);
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current).toEqual(notNIM);
  });
  it('should skip requests without a runtime reference', async () => {
    const model = mockInferenceServiceK8sResource({});
    delete model.spec.predictor.model?.runtime;
    const { result } = renderHook(() => useIsNIMModel(model));
    await act(async () => undefined);
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current).toEqual(notNIM);
  });
  it('should skip requests without a namespace', async () => {
    const model = mockInferenceServiceK8sResource({ namespace: '' });
    const { result } = renderHook(() => useIsNIMModel(model));
    await act(async () => undefined);
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current).toEqual(notNIM);
  });
  it.each(['Not found', 'Forbidden', 'Network failure'])('should surface %s', async (message) => {
    const error = new Error(message);
    mockGet.mockRejectedValue(error);
    const { result } = renderHook(() => useIsNIMModel(mockInferenceServiceK8sResource({})));
    await waitFor(() => expect(result.current.error).toBe(error));
    expect(result.current.loading).toBe(false);
    expect(result.current.isNIMModel).toBe(false);
  });
  it('should clear a previous error when NIM becomes disabled', async () => {
    const error = new Error('Forbidden');
    mockGet.mockRejectedValue(error);
    const { result, rerender } = renderHook(() =>
      useIsNIMModel(mockInferenceServiceK8sResource({})),
    );
    await waitFor(() => expect(result.current.error).toBe(error));
    setNIMEnabled(false);
    rerender();
    expect(result.current).toEqual(notNIM);
    await act(async () => undefined);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
  it('should cancel old requests and avoid stale identity after switching namespace', async () => {
    let resolveOld: (value: ServingRuntimeKind) => void = () => undefined;
    mockGet.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    mockGet.mockResolvedValueOnce(mockServingRuntimeK8sResource({ namespace: 'next-project' }));
    const { result, rerender } = renderHook(
      ({ namespace }) => useIsNIMModel(mockInferenceServiceK8sResource({ namespace })),
      { initialProps: { namespace: 'test-project' } },
    );
    rerender({ namespace: 'next-project' });
    expect(result.current.isNIMModel).toBe(false);
    expect(result.current.loading).toBe(true);
    expect(mockGet.mock.calls[0][2]?.signal?.aborted).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => resolveOld(mockNimServingRuntime()));
    expect(result.current).toEqual(notNIM);
  });
});
