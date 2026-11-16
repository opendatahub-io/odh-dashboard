import * as React from 'react';
import { render } from '@testing-library/react';
import { AnalyticsTrackingProvider } from '@odh-dashboard/analytics/react';
import { TrackingOutcome } from '@odh-dashboard/analytics/types';
import type { UserInteractionAPI } from '@mf/modelRegistry/extension-points';
import SegmentUserInteractionProvider from '../SegmentUserInteractionProvider';

describe('SegmentUserInteractionProvider', () => {
  afterEach(() => jest.restoreAllMocks());
  const renderApi = () => {
    let api: UserInteractionAPI;
    const tracking = { trackEvent: jest.fn(), trackPageEvent: jest.fn() };
    const capture = (value: UserInteractionAPI) => {
      api = value;
      return null;
    };
    const tree = (value = tracking) => (
      <AnalyticsTrackingProvider value={value}>
        <SegmentUserInteractionProvider>{capture}</SegmentUserInteractionProvider>
      </AnalyticsTrackingProvider>
    );
    const rendered = render(tree());
    return {
      tracking,
      getApi: () => api,
      rerender: (value = tracking) => rendered.rerender(tree(value)),
    };
  };

  it('should forward form and link names and properties exactly once each', () => {
    const { getApi, tracking } = renderApi();
    const api = getApi();
    api.trackFormEvent('Model Registered', {
      outcome: TrackingOutcome.submit,
      success: false,
      error: 'failed',
    });
    api.trackFormEvent('Model Registration Canceled', { outcome: TrackingOutcome.cancel });
    api.trackLinkEvent('Catalog Link Clicked', {
      href: '/modelCatalog',
      type: 'model',
      section: 'Model Catalog',
      name: 'View model',
    });

    expect(tracking.trackEvent.mock.calls).toStrictEqual([
      ['Model Registered', { outcome: 'submit', success: false, error: 'failed' }],
      ['Model Registration Canceled', { outcome: 'cancel' }],
      [
        'Catalog Link Clicked',
        { href: '/modelCatalog', type: 'model', section: 'Model Catalog', name: 'View model' },
      ],
    ]);
    expect(tracking.trackPageEvent).not.toHaveBeenCalled();
  });

  it('should preserve simple events with omitted, empty, and populated properties', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation();
    const { getApi, tracking } = renderApi();
    const api = getApi();
    api.trackSimpleEvent('Catalog Opened');
    api.trackSimpleEvent('Catalog Refreshed', {});
    api.trackSimpleEvent('Model Selected', { name: 'model', count: 0, success: false });

    expect(tracking.trackEvent.mock.calls).toStrictEqual([
      ['Catalog Opened', {}],
      ['Catalog Refreshed', {}],
      ['Model Selected', { name: 'model', count: 0, success: false }],
    ]);
    expect(warn).not.toHaveBeenCalled();
    expect(tracking.trackPageEvent).not.toHaveBeenCalled();
  });

  it('should forward one explicit page operation without custom events or render emissions', () => {
    const { getApi, tracking, rerender } = renderApi();
    rerender();
    expect(tracking.trackEvent).not.toHaveBeenCalled();
    expect(tracking.trackPageEvent).not.toHaveBeenCalled();

    getApi().trackPageEvent();
    rerender();

    expect(tracking.trackPageEvent.mock.calls).toStrictEqual([[]]);
    expect(tracking.trackEvent).not.toHaveBeenCalled();
  });

  it('should keep the interaction API stable while callbacks are unchanged', () => {
    const { getApi, tracking, rerender } = renderApi();
    const initialApi = getApi();
    rerender({ ...tracking });
    expect(getApi()).toBe(initialApi);
    expect(tracking.trackEvent).not.toHaveBeenCalled();
    expect(tracking.trackPageEvent).not.toHaveBeenCalled();
  });

  it('should replace the API when callbacks change and use the replacement callbacks', () => {
    const { getApi, tracking, rerender } = renderApi();
    const initialApi = getApi();
    const replacement = { trackEvent: jest.fn(), trackPageEvent: jest.fn() };
    rerender(replacement);
    expect(getApi()).not.toBe(initialApi);

    getApi().trackSimpleEvent('Catalog Opened');
    getApi().trackPageEvent();
    expect(replacement.trackEvent.mock.calls).toStrictEqual([['Catalog Opened', {}]]);
    expect(replacement.trackPageEvent.mock.calls).toStrictEqual([[]]);
    expect(tracking.trackEvent).not.toHaveBeenCalled();
    expect(tracking.trackPageEvent).not.toHaveBeenCalled();
  });
});
