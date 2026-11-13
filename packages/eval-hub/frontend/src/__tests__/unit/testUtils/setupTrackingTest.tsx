import * as React from 'react';
import {
  render as renderRTL,
  type RenderOptions,
  type RenderHookOptions,
} from '@testing-library/react';
import type { TrackEvent } from '@odh-dashboard/analytics/types';
import { TrackingProvider } from './TrackingProvider';
import { renderHook as renderHookWithMatchers, type RenderHookResultExt } from './hooks';

/** Call once per spec to install an isolated spy, provider wrappers, and cleanup. */
export const setupTrackingTest = (
  implementation?: TrackEvent,
): {
  mockTrackEvent: jest.MockedFunction<TrackEvent>;
  render: (ui: React.ReactElement, options?: RenderOptions) => ReturnType<typeof renderRTL>;
  renderHook: <Result, Props>(
    callback: (props: Props) => Result,
    options?: RenderHookOptions<Props>,
  ) => RenderHookResultExt<Result, Props>;
} => {
  const mockTrackEvent = jest.fn<ReturnType<TrackEvent>, Parameters<TrackEvent>>(implementation);
  beforeEach(() => {
    mockTrackEvent.mockClear();
    window.__evalHubTrackingEvents?.clear();
  });

  const wrap = (Wrapper?: RenderOptions['wrapper']) => {
    const WrapperWithTracking: React.FC<React.PropsWithChildren> = ({ children }) => (
      <TrackingProvider trackEvent={mockTrackEvent}>
        {Wrapper ? <Wrapper>{children}</Wrapper> : children}
      </TrackingProvider>
    );
    return WrapperWithTracking;
  };
  const render = (ui: React.ReactElement, options?: RenderOptions) =>
    renderRTL(ui, { ...options, wrapper: wrap(options?.wrapper) });
  const renderHook = <Result, Props>(
    callback: (props: Props) => Result,
    options?: RenderHookOptions<Props>,
  ) => renderHookWithMatchers(callback, { ...options, wrapper: wrap(options?.wrapper) });

  return { mockTrackEvent, render, renderHook };
};
