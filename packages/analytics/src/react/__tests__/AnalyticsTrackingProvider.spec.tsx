import * as React from 'react';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import {
  AnalyticsTrackingProvider,
  NoopAnalyticsTrackingProvider,
  useTrackEvent,
  useTrackPageEvent,
} from '../index';
import type { TrackEvent, TrackPageEvent } from '../../types';

// Importing the React entry point must never load an SDK or concrete adapter.
jest.mock('@segment/analytics-next', () => {
  throw new Error('The analytics React entry point loaded Segment');
});
jest.mock('../../index', () => {
  throw new Error('The analytics React entry point loaded the implementation');
});

describe('AnalyticsTrackingProvider', () => {
  const useTracking = () => ({ event: useTrackEvent(), page: useTrackPageEvent() });
  const renderTracking = (
    getValue: () => { trackEvent: TrackEvent; trackPageEvent: TrackPageEvent },
  ) =>
    renderHook(useTracking, {
      wrapper: ({ children }: React.PropsWithChildren) => (
        <AnalyticsTrackingProvider value={getValue()}>{children}</AnalyticsTrackingProvider>
      ),
    });

  it('should preserve callback identity and emit only on explicit invocation', () => {
    const trackEvent = jest.fn();
    const trackPageEvent = jest.fn();
    const callbacks = { trackEvent, trackPageEvent };
    const rendered = renderTracking(() => callbacks);
    rendered.rerender();
    expect(rendered).hookToHaveUpdateCount(2);
    expect(rendered.result.current.event).toBe(trackEvent);
    expect(rendered.result.current.page).toBe(trackPageEvent);
    expect(trackEvent).not.toHaveBeenCalled();
    expect(trackPageEvent).not.toHaveBeenCalled();
    rendered.result.current.event('Model Selected', {
      count: 0,
      enabled: false,
      tags: ['validated'],
    });
    expect(trackEvent.mock.calls).toStrictEqual([
      ['Model Selected', { count: 0, enabled: false, tags: ['validated'] }],
    ]);
    expect(trackPageEvent).not.toHaveBeenCalled();
    rendered.result.current.page();
    expect(trackPageEvent.mock.calls).toStrictEqual([[]]);
    expect(trackEvent).toHaveBeenCalledTimes(1);
  });

  it('should replace either callback independently without emitting on updates', () => {
    const trackEvent = jest.fn();
    const trackPageEvent = jest.fn();
    let callbacks = { trackEvent, trackPageEvent };
    const rendered = renderTracking(() => callbacks);
    const replacementEvent = jest.fn();
    callbacks = { ...callbacks, trackEvent: replacementEvent };
    rendered.rerender();
    expect(rendered.result.current.event).toBe(replacementEvent);
    expect(rendered.result.current.page).toBe(trackPageEvent);
    const replacementPage = jest.fn();
    callbacks = { ...callbacks, trackPageEvent: replacementPage };
    rendered.rerender();
    expect(rendered.result.current.event).toBe(replacementEvent);
    expect(rendered.result.current.page).toBe(replacementPage);
    expect(rendered).hookToHaveUpdateCount(3);
    for (const callback of [trackEvent, trackPageEvent, replacementEvent, replacementPage]) {
      expect(callback).not.toHaveBeenCalled();
    }
  });

  it('should fail explicitly when either operation is invoked without its provider', () => {
    const rendered = renderHook(useTracking);
    expect(rendered).hookToHaveUpdateCount(1);
    expect(() => rendered.result.current.event('event', {})).toThrow(
      'AnalyticsTrackingProvider not provided: trackEvent',
    );
    expect(() => rendered.result.current.page()).toThrow(
      'AnalyticsTrackingProvider not provided: trackPageEvent',
    );
  });

  it('should supply stable no-ops without reading or initializing an SDK', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'analytics');
    const read = jest.fn();
    const write = jest.fn();
    Object.defineProperty(window, 'analytics', { configurable: true, get: read, set: write });
    try {
      const rendered = renderHook(useTracking, { wrapper: NoopAnalyticsTrackingProvider });
      const initial = rendered.result.current;
      expect(initial.event('event', {})).toBeUndefined();
      expect(initial.page()).toBeUndefined();
      rendered.rerender();
      expect(rendered.result.current.event).toBe(initial.event);
      expect(rendered.result.current.page).toBe(initial.page);
      expect(rendered).hookToHaveUpdateCount(2);
      expect(read).not.toHaveBeenCalled();
      expect(write).not.toHaveBeenCalled();
    } finally {
      if (original) Object.defineProperty(window, 'analytics', original);
      else Reflect.deleteProperty(window, 'analytics');
    }
  });
});
