/* eslint-disable camelcase */
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  createEvalHubTrackingScope,
  trackEvalHubEvent,
  trackEvalHubEventOnce,
} from '~/app/tracking/evalhubTracking';
import {
  EVAL_HUB_EVENTS,
  type CollectionSavedProperties,
} from '~/app/tracking/evalhubTrackingConstants';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

const mockFireFormTrackingEvent = jest.mocked(fireFormTrackingEvent);
const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);

describe('EvalHub tracking helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.__evalHubTrackingEvents?.clear();
  });

  it('routes collection saves through form tracking with a normalized submit outcome', () => {
    trackEvalHubEvent(EVAL_HUB_EVENTS.COLLECTION_SAVED, {
      outcome: TrackingOutcome.submit,
      success: true,
      collectionName: 'my-safety-suite',
      saveMode: 'create',
      action: 'save',
      fromCurated: false,
      countOfEvaluatesAssetTypes: 1,
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.COLLECTION_SAVED,
      expect.objectContaining({
        outcome: TrackingOutcome.submit,
        success: true,
        saveMode: 'create',
        action: 'save',
        fromCurated: false,
        countOfEvaluatesAssetTypes: 1,
      }),
    );
    expect(mockFireFormTrackingEvent.mock.calls[0][1]).not.toHaveProperty('collectionName');
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
      collection_type: 'custom',
      provider_type: 'lmeval',
    });
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

  it('drops properties that are not in the event allowlist', () => {
    const extraFields = {
      username: 'secret-user',
      credentials: { token: 'secret-token' },
    };
    const properties = { surface: 'benchmark_suites_page', ...extraFields };

    trackEvalHubEvent(EVAL_HUB_EVENTS.JOB_CREATE_OPENED, properties);

    expect(mockFireMiscTrackingEvent).toHaveBeenCalledTimes(1);
    const payload = mockFireMiscTrackingEvent.mock.calls[0][1];
    expect(payload).not.toHaveProperty('username');
    expect(payload).not.toHaveProperty('credentials');
    expect(payload).toEqual({
      surface: 'benchmark_suites_page',
      event_source: 'evalhub_ui',
      collection_type: 'unknown',
      provider_type: 'unknown',
    });
  });

  it('drops non-allowlisted properties from form events too', () => {
    const validProperties: CollectionSavedProperties = {
      outcome: TrackingOutcome.submit,
      success: true,
      collectionName: 'my-safety-suite',
      saveMode: 'create',
      action: 'save',
      fromCurated: false,
      countOfEvaluatesAssetTypes: 1,
    };
    const properties = { ...validProperties, apiKey: 'secret-key' };

    trackEvalHubEvent(EVAL_HUB_EVENTS.COLLECTION_SAVED, properties);

    expect(mockFireFormTrackingEvent).toHaveBeenCalledTimes(1);
    const payload = mockFireFormTrackingEvent.mock.calls[0][1];
    expect(payload).not.toHaveProperty('apiKey');
    expect(payload).not.toHaveProperty('collectionName');
    expect(payload).toEqual(expect.objectContaining({ success: true }));
  });

  it('drops user-entered collection names for custom suites', () => {
    trackEvalHubEvent(
      EVAL_HUB_EVENTS.COLLECTION_DELETED,
      { collectionName: 'my-safety-suite', outcome: 'success' },
      { collectionType: 'custom' },
    );

    expect(mockFireMiscTrackingEvent).toHaveBeenCalledTimes(1);
    const payload = mockFireMiscTrackingEvent.mock.calls[0][1];
    expect(payload).not.toHaveProperty('collectionName');
    expect(payload).toEqual(
      expect.objectContaining({ outcome: 'success', collection_type: 'custom' }),
    );
  });

  it('keeps collection names for curated (system) collections', () => {
    trackEvalHubEvent(
      EVAL_HUB_EVENTS.COLLECTION_DETAIL_VIEWED,
      { collectionName: 'Safety benchmarks', surface: 'curated_gallery' },
      { collectionType: 'system' },
    );

    expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.COLLECTION_DETAIL_VIEWED,
      expect.objectContaining({
        collectionName: 'Safety benchmarks',
        collection_type: 'system',
      }),
    );
  });

  it('drops collection names when the collection type is unknown', () => {
    trackEvalHubEvent(EVAL_HUB_EVENTS.RESULT_BENCHMARK_CARD_SELECTED, {
      benchmarkId: 'toxicity',
      collectionName: 'some-collection',
    });

    expect(mockFireMiscTrackingEvent.mock.calls[0][1]).not.toHaveProperty('collectionName');
  });

  it('emits once for a stable render key', () => {
    trackEvalHubEventOnce(EVAL_HUB_EVENTS.COMPARISON_VIEW_RENDERED, 'run-1,run-2', {
      surface: 'comparison_view',
      countOfRuns: 2,
    });
    trackEvalHubEventOnce(EVAL_HUB_EVENTS.COMPARISON_VIEW_RENDERED, 'run-1,run-2', {
      surface: 'comparison_view',
      countOfRuns: 2,
    });

    expect(mockFireMiscTrackingEvent).toHaveBeenCalledTimes(1);
  });

  it('allows the same key to emit again in a new mounted-view visit', () => {
    const trackingScope = createEvalHubTrackingScope();

    trackingScope.trackEventOnce(EVAL_HUB_EVENTS.COMPARISON_VIEW_RENDERED, 'run-1,run-2', {
      surface: 'comparison_view',
      countOfRuns: 2,
    });
    trackingScope.trackEventOnce(EVAL_HUB_EVENTS.COMPARISON_VIEW_RENDERED, 'run-1,run-2', {
      surface: 'comparison_view',
      countOfRuns: 2,
    });
    expect(mockFireMiscTrackingEvent).toHaveBeenCalledTimes(1);

    trackingScope.clear();
    trackingScope.trackEventOnce(EVAL_HUB_EVENTS.COMPARISON_VIEW_RENDERED, 'run-1,run-2', {
      surface: 'comparison_view',
      countOfRuns: 2,
    });

    expect(mockFireMiscTrackingEvent).toHaveBeenCalledTimes(2);
  });
});
