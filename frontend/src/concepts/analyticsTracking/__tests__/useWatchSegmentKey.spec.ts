import { testHook } from '@odh-dashboard/jest-config/hooks';
import { fetchSegmentKey } from '#~/concepts/analyticsTracking/segmentKeyService';
import { useWatchSegmentKey } from '#~/concepts/analyticsTracking/useWatchSegmentKey';

jest.mock('#~/concepts/analyticsTracking/segmentKeyService', () => ({
  fetchSegmentKey: jest.fn(),
}));

const fetchSegmentKeyMock = jest.mocked(fetchSegmentKey);

describe('useWatchSegmentKey', () => {
  it('should fetch segment key and amplitude key successfully', async () => {
    const segmentKeyMock = {
      segmentKey: 'test-key',
      amplitudeApiKey: 'test-amplitude-key',
    };
    fetchSegmentKeyMock.mockResolvedValue(segmentKeyMock);

    const renderResult = testHook(useWatchSegmentKey)();
    expect(fetchSegmentKeyMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual({
      segmentKey: '',
      amplitudeApiKey: '',
      loaded: false,
      loadError: undefined,
    });

    // Wait for the update
    await renderResult.waitForNextUpdate();
    expect(fetchSegmentKeyMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual({
      segmentKey: 'test-key',
      amplitudeApiKey: 'test-amplitude-key',
      loaded: true,
      loadError: undefined,
    });
  });

  it('should handle missing amplitude key', async () => {
    const segmentKeyMock = {
      segmentKey: 'test-key',
      amplitudeApiKey: '',
    };
    fetchSegmentKeyMock.mockResolvedValue(segmentKeyMock);

    const renderResult = testHook(useWatchSegmentKey)();
    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual({
      segmentKey: 'test-key',
      amplitudeApiKey: '',
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
      amplitudeApiKey: '',
      loaded: false,
      loadError: undefined,
    });

    // Wait for the update
    await renderResult.waitForNextUpdate();
    expect(fetchSegmentKeyMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual({
      segmentKey: '',
      amplitudeApiKey: '',
      loaded: false,
      loadError: new Error('error1'),
    });
  });
});
