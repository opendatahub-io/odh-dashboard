import { testHook } from '#~/__tests__/unit/testUtils/hooks';
import { fetchSegmentKey } from '#~/concepts/analyticsTracking/segmentKeyService';
import { useWatchSegmentKey } from '#~/concepts/analyticsTracking/useWatchSegmentKey';

jest.mock('#~/concepts/analyticsTracking/segmentKeyService', () => ({
  fetchSegmentKey: jest.fn(),
}));

const fetchSegmentKeyMock = jest.mocked(fetchSegmentKey);

describe('useWatchSegmentKey', () => {
  it('should fetch segment key successfully', async () => {
    const segmentKeyMock = {
      segmentKey: 'test-key',
    };
    fetchSegmentKeyMock.mockResolvedValue(segmentKeyMock);

    const renderResult = testHook(useWatchSegmentKey)();
    expect(fetchSegmentKeyMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual({
      segmentKey: '',
      loaded: false,
      loadError: undefined,
    });

    // Wait for the update
    await renderResult.waitForNextUpdate();
    expect(fetchSegmentKeyMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual({
      segmentKey: 'test-key',
      loaded: true,
      loadError: undefined,
    });
  });

  it('should handle errors', async () => {
    fetchSegmentKeyMock.mockRejectedValue(new Error('error1'));

    const renderResult = testHook(useWatchSegmentKey)();
    expect(fetchSegmentKeyMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual({
      segmentKey: '',
      loaded: false,
      loadError: undefined,
    });

    // Wait for the update
    await renderResult.waitForNextUpdate();
    expect(fetchSegmentKeyMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual({
      segmentKey: '',
      loaded: false,
      loadError: new Error('error1'),
    });
  });
});
