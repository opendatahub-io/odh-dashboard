import { AnalyticsBrowser } from '@segment/analytics-next';
import { initSegment } from '../initSegment';

jest.mock('@segment/analytics-next', () => ({
  AnalyticsBrowser: {
    load: jest.fn().mockReturnValue({ track: jest.fn(), page: jest.fn(), identify: jest.fn() }),
  },
}));

describe('initSegment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete window.analytics;
  });

  it('should initialize analytics when enabled with a key', async () => {
    await initSegment({ segmentKey: 'test-key', enabled: true });
    expect(AnalyticsBrowser.load).toHaveBeenCalledWith(
      {
        writeKey: 'test-key',
        cdnURL: 'https://console.redhat.com/connections/cdn',
      },
      {
        integrations: {
          'Segment.io': {
            apiHost: 'console.redhat.com/connections/api/v1',
            protocol: 'https',
          },
        },
      },
    );
    expect(window.analytics).toBeDefined();
  });

  it('should not initialize when disabled', async () => {
    await initSegment({ segmentKey: 'test-key', enabled: false });
    expect(AnalyticsBrowser.load).not.toHaveBeenCalled();
    expect(window.analytics).toBeUndefined();
  });

  it('should not initialize when segment key is empty', async () => {
    await initSegment({ segmentKey: '', enabled: true });
    expect(AnalyticsBrowser.load).not.toHaveBeenCalled();
    expect(window.analytics).toBeUndefined();
  });
});
