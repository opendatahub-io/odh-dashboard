import { createSegmentTracking, type SegmentTrackingOptions } from '../createSegmentTracking';

describe('createSegmentTracking', () => {
  const track = jest.fn();
  const page = jest.fn();
  const originalAnalytics = Object.getOwnPropertyDescriptor(window, 'analytics');
  let options: SegmentTrackingOptions;

  beforeEach(() => {
    jest.clearAllMocks();
    window.analytics = { track, page };
    options = { clusterID: 'cluster-1', devMode: false, version: '1.0.0' };
  });

  afterEach(() => {
    if (originalAnalytics) {
      Object.defineProperty(window, 'analytics', originalAnalytics);
    } else {
      Reflect.deleteProperty(window, 'analytics');
    }
  });

  it('should bind both operations without reading host settings or emitting on creation', () => {
    const getOptions = jest.fn(() => options);
    const tracking = createSegmentTracking(getOptions);

    expect(getOptions).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
    expect(page).not.toHaveBeenCalled();

    tracking.trackEvent('custom-event', { success: false, count: 0 });
    tracking.trackPageEvent();

    expect(track.mock.calls).toStrictEqual([
      [
        'custom-event',
        { success: false, count: 0, clusterID: 'cluster-1' },
        { app: { version: '1.0.0' } },
      ],
    ]);
    expect(page.mock.calls).toStrictEqual([
      [undefined, { clusterID: 'cluster-1' }, { app: { version: '1.0.0' } }],
    ]);
    expect(getOptions).toHaveBeenCalledTimes(2);
  });

  it('should read current metadata and enablement without replacing callbacks', () => {
    const tracking = createSegmentTracking(() => options);
    tracking.trackEvent('before', {});

    options = { clusterID: 'cluster-2', devMode: false, version: '2.0.0', enabled: false };
    tracking.trackEvent('disabled', {});
    tracking.trackPageEvent();
    expect(track).toHaveBeenCalledTimes(1);
    expect(page).not.toHaveBeenCalled();

    options.enabled = true;
    tracking.trackEvent('after', {});
    tracking.trackPageEvent();
    expect(track.mock.calls).toStrictEqual([
      ['before', { clusterID: 'cluster-1' }, { app: { version: '1.0.0' } }],
      ['after', { clusterID: 'cluster-2' }, { app: { version: '2.0.0' } }],
    ]);
    expect(page.mock.calls).toStrictEqual([
      [undefined, { clusterID: 'cluster-2' }, { app: { version: '2.0.0' } }],
    ]);
  });

  it('should safely ignore both operations when the SDK is absent', () => {
    Reflect.deleteProperty(window, 'analytics');
    const tracking = createSegmentTracking(() => options);

    expect(() => tracking.trackEvent('custom-event', {})).not.toThrow();
    expect(() => tracking.trackPageEvent()).not.toThrow();
  });
});
