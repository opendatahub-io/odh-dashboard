/* eslint-disable camelcase */
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  createEvalHubTrackingScope,
  getEvalHubServerVersion,
  setEvalHubServerVersion,
  trackEvalHubEvent,
  trackEvalHubEventOnce,
} from '~/app/tracking/evalhubTracking';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

const mockFireFormTrackingEvent = jest.mocked(fireFormTrackingEvent);
const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);

describe('EvalHub tracking helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setEvalHubServerVersion(undefined);
    window.__evalHubTrackingEvents?.clear();
  });

  it('routes collection saves through form tracking with a normalized submit outcome', () => {
    trackEvalHubEvent(EVAL_HUB_EVENTS.COLLECTION_SAVED, {
      outcome: TrackingOutcome.submit,
      success: true,
      collectionName: 'my-safety-suite',
      saveMode: 'create',
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.COLLECTION_SAVED,
      expect.objectContaining({
        outcome: TrackingOutcome.submit,
        success: true,
        collectionName: 'my-safety-suite',
        saveMode: 'create',
      }),
    );
    expect(mockFireMiscTrackingEvent).not.toHaveBeenCalled();
  });

  it('preserves existing keys and adds only shared context', () => {
    trackEvalHubEvent(
      'Evaluations Run Metric Selected',
      { metricName: 'accuracy', benchmarkName: 'ARC Easy', isDefault: false },
      { collectionType: 'custom', providerType: 'lmeval' },
    );

    expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Evaluations Run Metric Selected', {
      metricName: 'accuracy',
      benchmarkName: 'ARC Easy',
      isDefault: false,
      event_source: 'evalhub_ui',
      evalhub_server_version: 'unknown',
      collection_type: 'custom',
      provider_type: 'lmeval',
    });
  });

  it('uses the BFF version after the bootstrap updates it', () => {
    setEvalHubServerVersion('2.4.1');

    trackEvalHubEvent('evalhub.job.create.opened', { surface: 'benchmark_suites_page' });

    expect(getEvalHubServerVersion()).toBe('2.4.1');
    expect(mockFireMiscTrackingEvent.mock.calls[0][1]).toEqual(
      expect.objectContaining({ evalhub_server_version: '2.4.1' }),
    );
  });

  it('redacts URL values without removing the existing key', () => {
    trackEvalHubEvent('Evaluations External Link Clicked', {
      url: 'https://example.com/path?token=secret#fragment',
      benchmarkId: 'toxicity',
      surface: 'benchmark_drawer',
    });

    expect(mockFireMiscTrackingEvent.mock.calls[0][1]).toEqual(
      expect.objectContaining({ url: 'https://example.com' }),
    );
  });

  it('emits once for a stable render key', () => {
    trackEvalHubEventOnce('evalhub.comparison.view.rendered', 'run-1,run-2', {
      surface: 'comparison_view',
      countOfRuns: 2,
    });
    trackEvalHubEventOnce('evalhub.comparison.view.rendered', 'run-1,run-2', {
      surface: 'comparison_view',
      countOfRuns: 2,
    });

    expect(mockFireMiscTrackingEvent).toHaveBeenCalledTimes(1);
  });

  it('allows the same key to emit again in a new mounted-view visit', () => {
    const trackingScope = createEvalHubTrackingScope();

    trackingScope.trackEventOnce('evalhub.comparison.view.rendered', 'run-1,run-2', {
      surface: 'comparison_view',
      countOfRuns: 2,
    });
    trackingScope.trackEventOnce('evalhub.comparison.view.rendered', 'run-1,run-2', {
      surface: 'comparison_view',
      countOfRuns: 2,
    });
    expect(mockFireMiscTrackingEvent).toHaveBeenCalledTimes(1);

    trackingScope.clear();
    trackingScope.trackEventOnce('evalhub.comparison.view.rendered', 'run-1,run-2', {
      surface: 'comparison_view',
      countOfRuns: 2,
    });

    expect(mockFireMiscTrackingEvent).toHaveBeenCalledTimes(2);
  });
});
