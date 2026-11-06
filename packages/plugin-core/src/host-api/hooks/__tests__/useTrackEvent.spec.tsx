import React from 'react';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import { HostApiCoreContext } from '../../HostApiCoreContext';
import type { HostApiCoreServices } from '../../types';
import { useTrackEvent } from '../useTrackEvent';

type TrackEvent = HostApiCoreServices['trackEvent'];

const TrackingProvider: React.FC<React.PropsWithChildren<{ trackEvent: TrackEvent }>> = ({
  children,
  trackEvent,
}) => {
  const inherited = React.useContext(HostApiCoreContext);
  const value = React.useMemo(() => ({ ...inherited, trackEvent }), [inherited, trackEvent]);
  return <HostApiCoreContext.Provider value={value}>{children}</HostApiCoreContext.Provider>;
};

describe('useTrackEvent', () => {
  it('should retain the host callback across rerenders without emitting events', () => {
    const trackEvent = jest.fn();
    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <TrackingProvider trackEvent={trackEvent}>{children}</TrackingProvider>
    );
    const renderResult = renderHook(useTrackEvent, { wrapper });
    renderResult.rerender();

    expect(renderResult).hookToBe(trackEvent);
    expect(renderResult).hookToBeStable();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('should fail explicitly on use without a host provider', () => {
    const renderResult = renderHook(useTrackEvent);

    expect(renderResult).hookToHaveUpdateCount(1);
    expect(() => renderResult.result.current('custom-event', {})).toThrow(
      'HostApiCoreContext not provided: trackEvent',
    );
  });
});
