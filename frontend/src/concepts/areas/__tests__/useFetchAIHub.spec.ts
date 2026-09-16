import { act } from 'react';
import { standardUseFetchState, testHook } from '@odh-dashboard/jest-config/hooks';
import axios from '@odh-dashboard/ui-core/utilities/axios';
import useFetchAIHub from '#~/concepts/areas/useFetchAIHub';

jest.mock('@odh-dashboard/ui-core/utilities/axios', () => ({
  get: jest.fn(),
}));

const mockAxios = jest.mocked(axios.get);
const aiHub = {
  metadata: { name: 'default-aihub' },
  spec: { instancesNamespace: 'rhoai-model-registries' },
};

describe('useFetchAIHub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the AIHub resource and refresh from the canonical endpoint', async () => {
    mockAxios.mockResolvedValue({ data: aiHub });

    const renderResult = testHook(useFetchAIHub)();
    expect(mockAxios).toHaveBeenCalledWith('/api/aihub');
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null));

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual(standardUseFetchState(aiHub, true));

    await act(() => renderResult.result.current[3]());
    expect(mockAxios).toHaveBeenCalledTimes(2);
  });

  it('should return null only when AIHub is not installed', async () => {
    mockAxios.mockRejectedValue({ response: { status: 404 } });

    const renderResult = testHook(useFetchAIHub)();
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState(null, true));
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
  });
});
