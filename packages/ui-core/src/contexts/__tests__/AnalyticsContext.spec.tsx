import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  AnalyticsContext,
  useAnalytics,
  type AnalyticsAPI,
  type FormTrackingEventProperties,
  type MiscTrackingEventProperties,
  type LinkTrackingEventProperties,
  type IdentifyEventProperties,
  TrackingOutcome,
} from '../AnalyticsContext';

const ANALYTICS_API_KEYS: (keyof AnalyticsAPI)[] = [
  'fireFormTrackingEvent',
  'fireMiscTrackingEvent',
  'fireLinkTrackingEvent',
  'fireSimpleTrackingEvent',
  'firePageEvent',
  'fireIdentifyEvent',
];

const TestConsumer: React.FC = () => {
  const analytics = useAnalytics();
  return (
    <div data-testid="member-count">
      {ANALYTICS_API_KEYS.filter((key) => typeof analytics[key] === 'function').length}
    </div>
  );
};

describe('AnalyticsContext', () => {
  it('should default every AnalyticsAPI member to a callable no-op before a provider is mounted', () => {
    render(<TestConsumer />);
    expect(screen.getByTestId('member-count')).toHaveTextContent(String(ANALYTICS_API_KEYS.length));
  });

  it('should not throw and should return undefined when invoking any default (unmounted-provider) member', () => {
    let analytics: AnalyticsAPI | undefined;
    const Capture: React.FC = () => {
      analytics = useAnalytics();
      return null;
    };
    render(<Capture />);

    const formProperties: FormTrackingEventProperties = { outcome: TrackingOutcome.submit };
    const miscProperties: MiscTrackingEventProperties = { key: 'value' };
    const linkProperties: LinkTrackingEventProperties = { href: '/somewhere' };
    const identifyProperties: IdentifyEventProperties = {
      isAdmin: false,
      canCreateProjects: true,
    };

    expect(() => {
      expect(analytics?.fireFormTrackingEvent('event', formProperties)).toBeUndefined();
      expect(analytics?.fireMiscTrackingEvent('event', miscProperties)).toBeUndefined();
      expect(analytics?.fireLinkTrackingEvent('event', linkProperties)).toBeUndefined();
      expect(analytics?.fireSimpleTrackingEvent('event')).toBeUndefined();
      expect(analytics?.firePageEvent()).toBeUndefined();
      expect(analytics?.fireIdentifyEvent(identifyProperties)).toBeUndefined();
    }).not.toThrow();
  });

  it('should let a mounted provider override the default no-op implementation', () => {
    const fireSimpleTrackingEvent = jest.fn();
    const providerValue: AnalyticsAPI = {
      fireFormTrackingEvent: jest.fn(),
      fireMiscTrackingEvent: jest.fn(),
      fireLinkTrackingEvent: jest.fn(),
      fireSimpleTrackingEvent,
      firePageEvent: jest.fn(),
      fireIdentifyEvent: jest.fn(),
    };

    const TriggerConsumer: React.FC = () => {
      const analytics = useAnalytics();
      React.useEffect(() => {
        analytics.fireSimpleTrackingEvent('page-loaded');
      }, [analytics]);
      return null;
    };

    render(
      <AnalyticsContext.Provider value={providerValue}>
        <TriggerConsumer />
      </AnalyticsContext.Provider>,
    );

    expect(fireSimpleTrackingEvent).toHaveBeenCalledWith('page-loaded');
  });
});
