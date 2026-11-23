import { AnalyticsBrowser } from '@segment/analytics-next';
import { initSegment } from '../initSegment';

jest.mock('@segment/analytics-next', () => ({
  AnalyticsBrowser: {
    load: jest.fn().mockReturnValue({ track: jest.fn(), page: jest.fn(), identify: jest.fn() }),
  },
}));

describe('initSegment', () => {
  const connection = {
    cdnURL: 'https://cdn.example.test',
    apiHost: 'events.example.test/v1',
  };
  beforeEach(() => {
    jest.clearAllMocks();
    delete window.analytics;
  });

  it('should initialize analytics when enabled with a key', async () => {
    await initSegment({ ...connection, segmentKey: 'test-key', enabled: true });
    expect(AnalyticsBrowser.load).toHaveBeenCalledWith(
      {
        writeKey: 'test-key',
        cdnURL: 'https://cdn.example.test',
      },
      {
        integrations: {
          'Segment.io': {
            apiHost: 'events.example.test/v1',
            protocol: 'https',
          },
        },
      },
    );
    expect(window.analytics).toBeDefined();
  });

  it('should not initialize when disabled', async () => {
    await initSegment({ ...connection, segmentKey: 'test-key', enabled: false });
    expect(AnalyticsBrowser.load).not.toHaveBeenCalled();
    expect(window.analytics).toBeUndefined();
  });

  it('should not initialize when segment key is empty', async () => {
    await initSegment({ ...connection, segmentKey: '', enabled: true });
    expect(AnalyticsBrowser.load).not.toHaveBeenCalled();
    expect(window.analytics).toBeUndefined();
  });
});
