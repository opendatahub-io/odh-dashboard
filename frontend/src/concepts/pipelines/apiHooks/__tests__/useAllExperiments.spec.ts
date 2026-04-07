/* eslint-disable camelcase */
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { useAllExperiments } from '#~/concepts/pipelines/apiHooks/useExperiments';
import { buildMockExperimentKF } from '#~/__mocks__';

jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
}));

describe('useAllExperiments', () => {
  const mockListExperiments = jest.fn();
  const mockUsePipelinesAPI = usePipelinesAPI as jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    mockUsePipelinesAPI.mockReturnValue({
      api: {
        listExperiments: mockListExperiments,
      },
    });
  });

  it('should return empty list when there are no experiments', async () => {
    mockListExperiments.mockResolvedValue({});

    const renderResult = testHook(useAllExperiments)();
    await renderResult.waitForNextUpdate();

    expect(mockListExperiments).toHaveBeenCalledTimes(1);
    expect(renderResult.result.current[0].items).toStrictEqual([]);
  });

  it('should return all experiments from a single page', async () => {
    const experiments = [
      buildMockExperimentKF({ experiment_id: 'exp-1', display_name: 'Experiment 1' }),
      buildMockExperimentKF({ experiment_id: 'exp-2', display_name: 'Experiment 2' }),
    ];

    mockListExperiments.mockResolvedValue({ experiments });

    const renderResult = testHook(useAllExperiments)();
    await renderResult.waitForNextUpdate();

    expect(mockListExperiments).toHaveBeenCalledTimes(1);
    expect(renderResult.result.current[0].items).toEqual(experiments);
  });

  it('should fetch all pages when next_page_token is present', async () => {
    const page1Experiments = [
      buildMockExperimentKF({ experiment_id: 'exp-1', display_name: 'Experiment 1' }),
    ];
    const page2Experiments = [
      buildMockExperimentKF({ experiment_id: 'exp-2', display_name: 'Experiment 2' }),
    ];
    const page3Experiments = [
      buildMockExperimentKF({ experiment_id: 'exp-3', display_name: 'Experiment 3' }),
    ];

    mockListExperiments
      .mockResolvedValueOnce({ experiments: page1Experiments, next_page_token: 'token-page-2' })
      .mockResolvedValueOnce({ experiments: page2Experiments, next_page_token: 'token-page-3' })
      .mockResolvedValueOnce({ experiments: page3Experiments });

    const renderResult = testHook(useAllExperiments)();
    await renderResult.waitForNextUpdate();

    expect(mockListExperiments).toHaveBeenCalledTimes(3);
    expect(renderResult.result.current[0].items).toEqual([
      ...page1Experiments,
      ...page2Experiments,
      ...page3Experiments,
    ]);
  });

  it('should pass page tokens to subsequent requests', async () => {
    mockListExperiments
      .mockResolvedValueOnce({
        experiments: [buildMockExperimentKF({ experiment_id: 'exp-1' })],
        next_page_token: 'token-abc',
      })
      .mockResolvedValueOnce({
        experiments: [buildMockExperimentKF({ experiment_id: 'exp-2' })],
      });

    const renderResult = testHook(useAllExperiments)();
    await renderResult.waitForNextUpdate();

    expect(mockListExperiments).toHaveBeenCalledTimes(2);
    expect(mockListExperiments).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ pageToken: 'token-abc' }),
    );
  });

  it('should handle fetch error', async () => {
    mockListExperiments.mockRejectedValue(new Error('Failed to fetch'));

    const renderResult = testHook(useAllExperiments)();
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current[2]).toBeInstanceOf(Error);
    expect(renderResult.result.current[2]?.message).toBe('Failed to fetch');
  });

  it('should handle error on subsequent page', async () => {
    mockListExperiments
      .mockResolvedValueOnce({
        experiments: [buildMockExperimentKF({ experiment_id: 'exp-1' })],
        next_page_token: 'token-page-2',
      })
      .mockRejectedValueOnce(new Error('Page 2 failed'));

    const renderResult = testHook(useAllExperiments)();
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current[2]).toBeInstanceOf(Error);
    expect(renderResult.result.current[2]?.message).toBe('Page 2 failed');
  });
});
