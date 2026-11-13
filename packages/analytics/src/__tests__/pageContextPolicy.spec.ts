import { Analytics } from '@segment/analytics-next';
import type { PageContextPolicy, TrackingPageContext } from '../types';
import { createSegmentTracking } from '../createSegmentTracking';

const redactedPage: TrackingPageContext = {
  path: '/[redacted]',
  url: 'https://example.com/[redacted]',
  referrer: 'https://referrer.example/[redacted]',
  search: '',
  title: 'Example',
};

describe('per-event page-context policy', () => {
  const options = { clusterID: 'cluster-1', version: 'test-version', devMode: false };
  const originalAnalytics = Object.getOwnPropertyDescriptor(window, 'analytics');
  const originalUrl = window.location.href;
  const originalHistoryState: unknown = window.history.state;
  const originalTitle = document.title;

  beforeEach(() => {
    Reflect.deleteProperty(window, 'analytics');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalAnalytics) {
      Object.defineProperty(window, 'analytics', originalAnalytics);
    } else {
      Reflect.deleteProperty(window, 'analytics');
    }
    window.history.replaceState(originalHistoryState, '', originalUrl);
    document.title = originalTitle;
  });

  it('should override real SDK page enrichment without affecting subsequent events', async () => {
    window.history.replaceState(null, '', '/private/item?secret=hidden#fragment');
    document.title = 'Private item';
    jest.spyOn(document, 'referrer', 'get').mockReturnValue('https://private.example/source');
    const rawPage = {
      path: '/private/item',
      url: `${window.location.origin}/private/item?secret=hidden`,
      referrer: 'https://private.example/source',
      search: '?secret=hidden',
      title: 'Private item',
    };
    const sdk = new Analytics(
      { writeKey: 'test' },
      { disableClientPersistence: true, retryQueue: false },
    );
    const track = jest.spyOn(sdk, 'track');
    window.analytics = sdk;
    const policy = jest.fn(() => ({ ...redactedPage }));
    const tracking = createSegmentTracking(() => options);

    tracking.trackEvent('Example', { success: false, count: 0 }, { pageContextPolicy: policy });
    const result = await track.mock.results[0].value;

    expect(result.event.context?.page).toEqual(redactedPage);
    expect(result.event.context?.app).toEqual({ version: 'test-version' });
    expect(result.event.properties).toEqual({ success: false, count: 0, clusterID: 'cluster-1' });
    expect(track).toHaveBeenCalledTimes(1);
    expect(policy).toHaveBeenCalledTimes(1);
    expect(policy).toHaveBeenCalledWith(rawPage);
    expect(JSON.stringify(result.event)).not.toContain('pageContextPolicy');

    tracking.trackEvent('Unrelated', {});
    const unrelated = await track.mock.results[1].value;

    expect(unrelated.event.context?.page).toEqual(rawPage);
    expect(track).toHaveBeenCalledTimes(2);
    expect(policy).toHaveBeenCalledTimes(1);
  });

  it('should apply each event policy to the current SDK after replacement', () => {
    const first = { track: jest.fn() };
    const second = { track: jest.fn() };
    window.analytics = first;
    const tracking = createSegmentTracking(() => options);
    tracking.trackEvent('First', {}, { pageContextPolicy: () => ({ ...redactedPage }) });
    window.analytics = second;
    tracking.trackEvent(
      'Second',
      {},
      { pageContextPolicy: () => ({ ...redactedPage, path: '/other' }) },
    );
    expect(first.track.mock.calls).toEqual([
      [
        'First',
        { clusterID: 'cluster-1' },
        { app: { version: 'test-version' }, page: redactedPage },
      ],
    ]);
    expect(second.track.mock.calls).toEqual([
      [
        'Second',
        { clusterID: 'cluster-1' },
        { app: { version: 'test-version' }, page: { ...redactedPage, path: '/other' } },
      ],
    ]);
  });

  it.each([true, false])(
    'should log development events without evaluating policies (SDK present: %s)',
    (sdkPresent) => {
      const track = jest.fn();
      if (sdkPresent) {
        window.analytics = { track };
      }
      const policy = jest.fn(() => ({ ...redactedPage }));
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const tracking = createSegmentTracking(() => ({ ...options, devMode: true }));
      tracking.trackEvent('Example', { success: false }, { pageContextPolicy: policy });
      expect(log.mock.calls).toEqual([
        ['Telemetry event triggered: Example - {"success":false} for version test-version'],
      ]);
      expect(track).not.toHaveBeenCalled();
      expect(policy).not.toHaveBeenCalled();
    },
  );

  it.each(['disabled', 'SDK absent'] as const)(
    'should not evaluate policies when delivery is %s',
    (state) => {
      const policy = jest.fn(() => ({ ...redactedPage }));
      const track = jest.fn();
      if (state === 'disabled') {
        window.analytics = { track };
      }
      const tracking = createSegmentTracking(() => ({ ...options, enabled: state !== 'disabled' }));
      tracking.trackEvent('Example', {}, { pageContextPolicy: policy });
      expect(policy).not.toHaveBeenCalled();
      expect(track).not.toHaveBeenCalled();
    },
  );

  it.each<keyof TrackingPageContext>(['path', 'url', 'referrer', 'search', 'title'])(
    'should reject policies returning a missing or non-string %s before SDK delivery',
    (key) => {
      const track = jest.fn();
      window.analytics = { track };
      const tracking = createSegmentTracking(() => options);
      const invalidPage = { ...redactedPage };
      // Model an untyped caller violating the complete-page contract.
      const invalid: PageContextPolicy = () => invalidPage;
      Reflect.deleteProperty(invalidPage, key);
      expect(() => tracking.trackEvent('Invalid', {}, { pageContextPolicy: invalid })).toThrow(
        'all page fields',
      );
      expect(track).not.toHaveBeenCalled();

      Reflect.set(invalidPage, key, null);
      expect(() => tracking.trackEvent('Invalid', {}, { pageContextPolicy: invalid })).toThrow(
        'all page fields',
      );
      expect(track).not.toHaveBeenCalled();
    },
  );

  it('should propagate policy failures without delivering an event', () => {
    const track = jest.fn();
    window.analytics = { track };
    const tracking = createSegmentTracking(() => options);
    expect(() =>
      tracking.trackEvent(
        'Throws',
        {},
        {
          pageContextPolicy: () => {
            throw new Error('policy failure');
          },
        },
      ),
    ).toThrow('policy failure');
    expect(track).not.toHaveBeenCalled();
  });

  it('should pass SDK-normalized canonical page context to the policy', () => {
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = 'https://canonical.example/canonical/private';
    document.head.appendChild(canonical);
    const policy = jest.fn(() => ({ ...redactedPage }));
    const track = jest.fn();
    try {
      window.analytics = { track };
      createSegmentTracking(() => options).trackEvent(
        'Canonical',
        {},
        { pageContextPolicy: policy },
      );
      expect(policy).toHaveBeenCalledTimes(1);
      expect(policy).toHaveBeenCalledWith({
        path: '/canonical/private',
        url: 'https://canonical.example/canonical/private',
        search: '',
        title: document.title,
        referrer: document.referrer,
      });
      expect(track.mock.calls).toEqual([
        [
          'Canonical',
          { clusterID: 'cluster-1' },
          { app: { version: 'test-version' }, page: redactedPage },
        ],
      ]);
    } finally {
      canonical.remove();
    }
  });
});
