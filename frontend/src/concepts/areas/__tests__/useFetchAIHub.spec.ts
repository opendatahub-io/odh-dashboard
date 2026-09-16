import { act } from 'react';
import { standardUseFetchState, testHook } from '@odh-dashboard/jest-config/hooks';
import { mockAIHub } from '@odh-dashboard/k8s-core/__mocks__/mockAIHub';
import axios from '@odh-dashboard/ui-core/utilities/axios';
import useFetchAIHub from '#~/concepts/areas/useFetchAIHub';

jest.mock('@odh-dashboard/ui-core/utilities/axios', () => ({
  get: jest.fn(),
}));

const mockAxios = jest.mocked(axios.get);
const aiHub = mockAIHub({ instancesNamespace: 'rhoai-model-registries' });

describe('useFetchAIHub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the AIHub resource and refresh from the canonical endpoint', async () => {
    mockAxios.mockResolvedValue({ data: aiHub });

    const renderResult = testHook(useFetchAIHub)();
    expect(mockAxios).toHaveBeenCalledWith('/api/aihub');
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual(standardUseFetchState(aiHub, true));
    expect(renderResult).hookToHaveUpdateCount(2);

    await act(() => renderResult.result.current[3]());
    expect(mockAxios).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToHaveUpdateCount(3);
  });

  it('should return null when the backend reports that default-aihub is absent', async () => {
    mockAxios.mockResolvedValue({ data: null });

    const renderResult = testHook(useFetchAIHub)();
    expect(renderResult).hookToHaveUpdateCount(1);
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState(null, true));
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should surface an error for a malformed successful AIHub response', async () => {
    mockAxios.mockResolvedValue({ data: {} });

    const renderResult = testHook(useFetchAIHub)();
    expect(renderResult).hookToHaveUpdateCount(1);
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(null, false, new Error('Invalid AIHub response format')),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should surface an HTTP 404 error instead of treating it as a missing AIHub', async () => {
    mockAxios.mockRejectedValue({
      response: {
        status: 404,
        data: { message: 'AIHub endpoint not found' },
      },
    });

    const renderResult = testHook(useFetchAIHub)();
    expect(renderResult).hookToHaveUpdateCount(1);
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(null, false, new Error('AIHub endpoint not found')),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should surface a dashboard configuration error instead of treating it as missing AIHub', async () => {
    mockAxios.mockRejectedValue({
      response: {
        status: 500,
        data: {
          message:
            'Dashboard is not permitted to read the AIHub configuration. Contact your cluster administrator.',
        },
      },
    });

    const renderResult = testHook(useFetchAIHub)();
    expect(renderResult).hookToHaveUpdateCount(1);
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(
        null,
        false,
        new Error(
          'Dashboard is not permitted to read the AIHub configuration. Contact your cluster administrator.',
        ),
      ),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
