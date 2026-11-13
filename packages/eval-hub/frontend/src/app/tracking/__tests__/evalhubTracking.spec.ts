/* eslint-disable camelcase */
import { TrackingOutcome } from '@odh-dashboard/analytics/types';
import { createEvalHubTracking } from '~/app/tracking/evalhubTracking';
import {
  EVAL_HUB_EVENTS,
  type CollectionSavedProperties,
} from '~/app/tracking/evalhubTrackingConstants';

const mockTrackEvent = jest.fn();
const {
  trackEvent: trackEvalHubEvent,
  trackEventOnce: trackEvalHubEventOnce,
  createScope: createEvalHubTrackingScope,
} = createEvalHubTracking(mockTrackEvent);

describe('EvalHub tracking helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.__evalHubTrackingEvents?.clear();
  });

  it('preserves form scalar filtering and a normalized submit outcome', () => {
    trackEvalHubEvent(EVAL_HUB_EVENTS.COLLECTION_SAVED, {
      outcome: TrackingOutcome.submit,
      success: true,
      collectionName: 'my-safety-suite',
      saveMode: 'create',
      action: 'save',
      fromCurated: false,
      countOfEvaluatesAssetTypes: 1,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.COLLECTION_SAVED,
      expect.objectContaining({
        outcome: TrackingOutcome.submit,
        success: true,
        saveMode: 'create',
        action: 'save',
        fromCurated: false,
        countOfEvaluatesAssetTypes: 1,
      }),
      expect.objectContaining({ pageContextPolicy: expect.any(Function) }),
    );
    expect(mockTrackEvent.mock.calls[0][1]).not.toHaveProperty('collectionName');
  });

  it('preserves existing keys and adds only shared context', () => {
    trackEvalHubEvent(
      'Evaluations Run Metric Selected',
      { metricName: 'accuracy', benchmarkName: 'ARC Easy', isDefault: false },
      { collectionType: 'custom', providerType: 'lmeval' },
    );

    expect(mockTrackEvent).toHaveBeenCalledWith(
      'Evaluations Run Metric Selected',
      {
        metricName: 'accuracy',
        benchmarkName: 'ARC Easy',
        isDefault: false,
        event_source: 'evalhub_ui',
        collection_type: 'custom',
        provider_type: 'lmeval',
      },
      expect.objectContaining({ pageContextPolicy: expect.any(Function) }),
    );
  });

  it('redacts URL values without removing the existing key', () => {
    trackEvalHubEvent('Evaluations External Link Clicked', {
      url: 'https://example.com/path?token=secret#fragment',
      benchmarkId: 'toxicity',
      surface: 'benchmark_drawer',
    });

    expect(mockTrackEvent.mock.calls[0][1]).toEqual(
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

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    const payload = mockTrackEvent.mock.calls[0][1];
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

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    const payload = mockTrackEvent.mock.calls[0][1];
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

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    const payload = mockTrackEvent.mock.calls[0][1];
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

    expect(mockTrackEvent).toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.COLLECTION_DETAIL_VIEWED,
      expect.objectContaining({
        collectionName: 'Safety benchmarks',
        collection_type: 'system',
      }),
      expect.objectContaining({ pageContextPolicy: expect.any(Function) }),
    );
  });

  it('drops collection names when the collection type is unknown', () => {
    trackEvalHubEvent(EVAL_HUB_EVENTS.RESULT_BENCHMARK_CARD_SELECTED, {
      benchmarkId: 'toxicity',
      collectionName: 'some-collection',
    });

    expect(mockTrackEvent.mock.calls[0][1]).not.toHaveProperty('collectionName');
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

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
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
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    trackingScope.clear();
    trackingScope.trackEventOnce(EVAL_HUB_EVENTS.COMPARISON_VIEW_RENDERED, 'run-1,run-2', {
      surface: 'comparison_view',
      countOfRuns: 2,
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
  });
});

describe('injected Eval Hub privacy contract', () => {
  it('should reduce raw status diagnostics to a category without leaking messages', () => {
    const trackEvent = jest.fn();
    const tracking = createEvalHubTracking(trackEvent);
    tracking.trackEvent(EVAL_HUB_EVENTS.EVALUATION_COMPLETED, {
      evaluationName: 'Example run',
      runOutcome: 'failed',
      error: { message: 'secret-token and private-user', message_code: 'gpu_unavailable' },
    });
    expect(trackEvent.mock.calls).toEqual([
      [
        EVAL_HUB_EVENTS.EVALUATION_COMPLETED,
        {
          evaluationName: 'Example run',
          runOutcome: 'failed',
          error: 'gpu_unavailable',
          event_source: 'evalhub_ui',
          collection_type: 'unknown',
          provider_type: 'unknown',
        },
        expect.objectContaining({ pageContextPolicy: expect.any(Function) }),
      ],
    ]);
  });

  it('should preserve false, zero, and explicit undefined form values while filtering non-scalars', () => {
    const trackEvent = jest.fn();
    const tracking = createEvalHubTracking(trackEvent);
    const properties: CollectionSavedProperties = {
      outcome: TrackingOutcome.submit,
      success: false,
      saveMode: 'create' as const,
      action: 'save' as const,
      fromCurated: false,
      countOfEvaluatesAssetTypes: 0,
      error_category: undefined,
      collectionName: 'Curated suite',
    };
    Object.assign(properties, { collectionName: ['private-name'] });
    tracking.trackEvent(EVAL_HUB_EVENTS.COLLECTION_SAVED, properties, { collectionType: 'system' });
    expect(trackEvent.mock.calls).toEqual([
      [
        EVAL_HUB_EVENTS.COLLECTION_SAVED,
        {
          outcome: 'submit',
          success: false,
          saveMode: 'create',
          action: 'save',
          fromCurated: false,
          countOfEvaluatesAssetTypes: 0,
          error_category: undefined,
          event_source: 'evalhub_ui',
          collection_type: 'system',
          provider_type: 'unknown',
        },
        expect.objectContaining({ pageContextPolicy: expect.any(Function) }),
      ],
    ]);
  });
});

it('should supply the feature-owned page policy as delivery options, separate from event properties', () => {
  const deliver = jest.fn<void, Parameters<import('@odh-dashboard/analytics/types').TrackEvent>>();
  createEvalHubTracking(deliver).trackEvent(EVAL_HUB_EVENTS.JOB_CREATE_OPENED, {
    surface: 'benchmark_suites_page',
  });
  expect(deliver).toHaveBeenCalledTimes(1);
  const options = deliver.mock.calls[0][2];
  if (!options?.pageContextPolicy) {
    throw new Error('Page-context policy was not forwarded');
  }
  expect(
    options.pageContextPolicy({
      path: '/evaluation/private-ns/results/private-job',
      url: 'https://example.com/evaluation/private-ns/results/private-job?token=secret#fragment',
      referrer: 'https://example.com/evaluation/private-ns/create/start?private=value',
      search: '?token=secret',
      title: 'Evaluation results',
    }),
  ).toEqual({
    path: '/evaluation/[redacted]/results/[redacted]',
    url: 'https://example.com/evaluation/[redacted]/results/[redacted]',
    referrer: 'https://example.com/evaluation/[redacted]/create/start',
    search: '',
    title: 'Evaluation results',
  });
  expect(deliver.mock.calls[0][1]).toEqual({
    surface: 'benchmark_suites_page',
    event_source: 'evalhub_ui',
    collection_type: 'unknown',
    provider_type: 'unknown',
  });
});
