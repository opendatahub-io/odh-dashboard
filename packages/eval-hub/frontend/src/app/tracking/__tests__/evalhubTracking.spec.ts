/* eslint-disable camelcase */
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  createEvalHubTrackingScope,
  getEvalHubServerVersion,
  setEvalHubServerVersion,
  trackEvalHubEvent,
  trackEvalHubEventOnce,
} from '~/app/tracking/evalhubTracking';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);

describe('EvalHub tracking helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setEvalHubServerVersion(undefined);
    window.__evalHubTrackingEvents?.clear();
  });

  it('preserves existing keys and adds only shared context', () => {
    trackEvalHubEvent(
      'Evaluations Run Metric Selected',
      { metricName: 'accuracy', benchmarkName: 'ARC Easy' },
      { collectionType: 'custom', providerType: 'lmeval' },
    );

    expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Evaluations Run Metric Selected', {
      metricName: 'accuracy',
      benchmarkName: 'ARC Easy',
      event_source: 'evalhub_ui',
      evalhub_server_version: 'unknown',
      collection_type: 'custom',
      provider_type: 'lmeval',
    });
  });

  it('uses the BFF version after the bootstrap updates it', () => {
    setEvalHubServerVersion('2.4.1');

    trackEvalHubEvent('evalhub.job.create.opened');

    expect(getEvalHubServerVersion()).toBe('2.4.1');
    expect(mockFireMiscTrackingEvent.mock.calls[0][1]).toEqual(
      expect.objectContaining({ evalhub_server_version: '2.4.1' }),
    );
  });

  it('redacts URL values without removing the existing key', () => {
    trackEvalHubEvent('Evaluations External Link Clicked', {
      url: 'https://example.com/path?token=secret#fragment',
    });

    expect(mockFireMiscTrackingEvent.mock.calls[0][1]).toEqual(
      expect.objectContaining({ url: 'https://example.com' }),
    );
  });

  it('emits once for a stable render key', () => {
    trackEvalHubEventOnce('evalhub.comparison.view.rendered', 'run-1,run-2', {
      countOfRuns: 2,
    });
    trackEvalHubEventOnce('evalhub.comparison.view.rendered', 'run-1,run-2', {
      countOfRuns: 2,
    });

    expect(mockFireMiscTrackingEvent).toHaveBeenCalledTimes(1);
  });

  it('allows the same key to emit again in a new mounted-view visit', () => {
    const trackingScope = createEvalHubTrackingScope();

    trackingScope.trackEventOnce('evalhub.comparison.view.rendered', 'run-1,run-2');
    trackingScope.trackEventOnce('evalhub.comparison.view.rendered', 'run-1,run-2');
    expect(mockFireMiscTrackingEvent).toHaveBeenCalledTimes(1);

    trackingScope.clear();
    trackingScope.trackEventOnce('evalhub.comparison.view.rendered', 'run-1,run-2');

    expect(mockFireMiscTrackingEvent).toHaveBeenCalledTimes(2);
  });
});
