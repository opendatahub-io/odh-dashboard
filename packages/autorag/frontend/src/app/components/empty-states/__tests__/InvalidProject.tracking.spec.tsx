import * as React from 'react';
import { render } from '@testing-library/react';
import { NoopAnalyticsTrackingProvider } from '@odh-dashboard/analytics/react';
import { InvalidProject as SharedComponent } from '@odh-dashboard/autox-core/ui/components/feature';
import { TrackingProvider } from '~/__tests__/unit/testUtils/TrackingProvider';
import InvalidProject from '~/app/components/empty-states/InvalidProject';

jest.mock('@odh-dashboard/autox-core/ui/components/feature', () => ({
  ...jest.requireActual('@odh-dashboard/autox-core/ui/components/feature'),
  InvalidProject: jest.fn(() => null),
}));

const sharedComponent = jest.mocked(SharedComponent);
const getCallback = () => sharedComponent.mock.calls.at(-1)?.[0].onProjectSelected;
const getRedirectPath = (namespace: string) => `/autorag/${namespace}`;

describe('InvalidProject tracking', () => {
  it('should forward selections once and use replacement tracking', () => {
    const trackEvent = jest.fn();
    const replacement = jest.fn();
    const element = <InvalidProject namespace="project-a" getRedirectPath={getRedirectPath} />;
    const { rerender } = render(
      <TrackingProvider trackEvent={trackEvent}>{element}</TrackingProvider>,
    );
    expect(trackEvent).not.toHaveBeenCalled();
    expect(sharedComponent.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ namespace: 'project-a', getRedirectPath }),
    );

    rerender(
      <TrackingProvider trackEvent={trackEvent}>{React.cloneElement(element)}</TrackingProvider>,
    );
    expect(trackEvent).not.toHaveBeenCalled();
    getCallback()?.('project-b');
    expect(trackEvent.mock.calls).toEqual([
      ['AutoRAG Project Dropdown Option Selected', { selectedProject: 'project-b' }],
    ]);

    rerender(
      <TrackingProvider trackEvent={replacement}>{React.cloneElement(element)}</TrackingProvider>,
    );
    expect(replacement).not.toHaveBeenCalled();
    getCallback()?.('project-c');
    expect(replacement.mock.calls).toEqual([
      ['AutoRAG Project Dropdown Option Selected', { selectedProject: 'project-c' }],
    ]);
    expect(trackEvent).toHaveBeenCalledTimes(1);
  });

  it('should fail explicitly on selection without a provider', () => {
    render(<InvalidProject getRedirectPath={getRedirectPath} />);
    expect(() => getCallback()?.('project-b')).toThrow('AnalyticsTrackingProvider not provided');
  });

  it('should support intentionally disabled standalone tracking', () => {
    render(
      <NoopAnalyticsTrackingProvider>
        <InvalidProject getRedirectPath={getRedirectPath} />
      </NoopAnalyticsTrackingProvider>,
    );
    expect(() => getCallback()?.('project-b')).not.toThrow();
  });
});
