/* eslint-disable camelcase */
import { act, waitFor } from '@testing-library/react';
import { useNavigate } from 'react-router';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { renderHook } from '~/__tests__/unit/testUtils/hooks';
import { cloneCollection } from '~/app/api/k8s';
import { useNotification } from '~/app/hooks/useNotification';
import { useCopySuiteForm, clampNumSamples } from '~/app/pages/useCopySuiteForm';
import type { Collection, Provider } from '~/app/types';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('react-router', () => ({
  useNavigate: jest.fn(),
}));

jest.mock('~/app/api/k8s', () => ({
  cloneCollection: jest.fn(),
}));

jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockNotification = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  remove: jest.fn(),
};

const mockUseNavigate = jest.mocked(useNavigate);
const mockCloneCollection = jest.mocked(cloneCollection);
const mockUseNotification = jest.mocked(useNotification);
const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);
const defaultSuiteNamePattern =
  /^Curated suite - [A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} (AM|PM)$/;

const sourceCollection: Collection = {
  resource: { id: 'source-collection' },
  name: 'Curated suite',
  description: 'A curated description',
  category: 'language',
  ai_entities: ['model'],
  custom: { source: 'curated', evaluates: ['model'] },
  pass_criteria: { threshold: 0.8 },
  benchmarks: [
    {
      id: 'benchmark-one',
      provider_id: 'provider-one',
      weight: 1,
      primary_score: { metric: 'accuracy', lower_is_better: false },
      pass_criteria: { threshold: 0.75 },
      parameters: { limit: 250, num_few_shot: 3 },
    },
  ],
};

const providers: Provider[] = [
  {
    resource: { id: 'provider-one' },
    name: 'Provider One',
    benchmarks: [
      {
        id: 'benchmark-one',
        name: 'Benchmark One',
        metrics: ['accuracy', 'f1'],
        primary_score: { metric: 'accuracy', lower_is_better: false },
        dataset_size: 1000,
        num_few_shot: 5,
      },
    ],
  },
  {
    resource: { id: 'provider-two' },
    name: 'Provider Two',
    benchmarks: [
      {
        id: 'benchmark-two',
        name: 'Benchmark Two',
        metrics: ['accuracy'],
        primary_score: { metric: 'accuracy', lower_is_better: false },
        dataset_size: 100,
        num_few_shot: 2,
        pass_criteria: { threshold: 0.7 },
      },
    ],
  },
];

type FormParams = Parameters<typeof useCopySuiteForm>[0];

const defaultParams: FormParams = {
  namespace: 'test-namespace',
  sourceCollection,
  providers,
  providersLoaded: true,
};

const renderForm = (overrides: Partial<FormParams> = {}) =>
  renderHook(() => useCopySuiteForm({ ...defaultParams, ...overrides }));

const createDeferred = <T>() => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseNavigate.mockReturnValue(mockNavigate);
  mockUseNotification.mockReturnValue(mockNotification);
});

describe('clampNumSamples', () => {
  it('should return undefined for blank or invalid values', () => {
    expect(clampNumSamples(undefined, 100)).toBeUndefined();
    expect(clampNumSamples(Number.NaN, 100)).toBeUndefined();
  });

  it('should enforce a minimum of 1', () => {
    expect(clampNumSamples(0, 100)).toBe(1);
    expect(clampNumSamples(-5, 100)).toBe(1);
  });

  it('should enforce the dataset size maximum when available', () => {
    expect(clampNumSamples(500, 200)).toBe(200);
    expect(clampNumSamples(50, 200)).toBe(50);
  });

  it('should only enforce the minimum when dataset size is unavailable', () => {
    expect(clampNumSamples(500)).toBe(500);
    expect(clampNumSamples(0)).toBe(1);
  });
});

describe('useCopySuiteForm', () => {
  it('should initialize suite fields and benchmark fields from the source collection', async () => {
    const result = renderForm();

    await waitFor(() =>
      expect(result.result.current.suiteName).toMatch(
        /^Curated suite - [A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} (AM|PM)$/,
      ),
    );

    expect(result.result.current.suiteDescription).toBe('A curated description');
    expect(result.result.current.suiteCategory).toBe('language');
    expect(result.result.current.suiteEvaluates).toBe('model');
    expect(result.result.current.suiteThreshold).toBe(80);
    expect(result.result.current.benchmarks).toEqual([
      expect.objectContaining({
        id: 'benchmark-one',
        providerId: 'provider-one',
        name: 'Benchmark One',
        weight: 1,
        primaryMetric: 'accuracy',
        numSamples: 250,
        datasetSize: 1000,
        numFewShot: 3,
        threshold: 75,
        availableMetrics: ['accuracy', 'f1'],
      }),
    ]);
    await waitFor(() => expect(result.result.current.isValid).toBe(true));
  });

  it('should append the current timestamp to the copied suite name', async () => {
    const toLocaleStringSpy = jest
      .spyOn(Date.prototype, 'toLocaleString')
      .mockReturnValue('Sep 8, 2026, 11:56 AM');

    try {
      const result = renderForm();

      await waitFor(() =>
        expect(result.result.current.suiteName).toBe('Curated suite - Sep 8, 2026, 11:56 AM'),
      );
      expect(toLocaleStringSpy).toHaveBeenCalledWith('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } finally {
      toLocaleStringSpy.mockRestore();
    }
  });

  it('should fall back to legacy custom evaluates metadata when ai_entities is absent', async () => {
    const legacySourceCollection: Collection = {
      ...sourceCollection,
      ai_entities: undefined,
      custom: { source: 'curated', evaluates: ['traces'] },
    };
    const result = renderForm({ sourceCollection: legacySourceCollection });

    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    expect(result.result.current.suiteEvaluates).toBe('traces');
  });

  it('should map num_fewshot parameters to the few-shot field and exclude them from advanced JSON', async () => {
    const collectionWithFewShotAlias: Collection = {
      ...sourceCollection,
      benchmarks: [
        {
          id: 'benchmark-one',
          provider_id: 'provider-one',
          weight: 1,
          primary_score: { metric: 'accuracy', lower_is_better: false },
          parameters: {
            limit: 250,
            num_fewshot: 0,
            blocking_subtask: 'harmless',
            blocking_subtask_threshold: 0.7,
          },
        },
      ],
    };

    const result = renderForm({ sourceCollection: collectionWithFewShotAlias });

    await waitFor(() => expect(result.result.current.benchmarks).toHaveLength(1));

    expect(result.result.current.benchmarks[0]).toEqual(
      expect.objectContaining({
        numFewShot: 0,
        additionalParameters: JSON.stringify(
          {
            blocking_subtask: 'harmless',
            blocking_subtask_threshold: 0.7,
          },
          null,
          2,
        ),
      }),
    );
  });

  it('should initialize with loaded providers when the collection resolves first', async () => {
    const collectionWithDefaults: Collection = {
      ...sourceCollection,
      benchmarks: [
        {
          id: 'benchmark-one',
          provider_id: 'provider-one',
          weight: 1,
        },
      ],
    };
    const result = renderHook((params: FormParams) => useCopySuiteForm(params), {
      initialProps: {
        ...defaultParams,
        sourceCollection: undefined,
        providers: [],
        providersLoaded: false,
      } as FormParams,
    });

    result.rerender({
      ...defaultParams,
      sourceCollection: collectionWithDefaults,
      providers: [],
      providersLoaded: false,
    });

    expect(result.result.current.suiteName).toBe('');
    expect(result.result.current.benchmarks).toEqual([]);

    result.rerender({
      ...defaultParams,
      sourceCollection: collectionWithDefaults,
      providers,
      providersLoaded: true,
    });

    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    expect(result.result.current.benchmarks).toEqual([
      expect.objectContaining({
        id: 'benchmark-one',
        name: 'Benchmark One',
        datasetSize: 1000,
        numSamples: 1000,
        numFewShot: 5,
        primaryMetric: 'accuracy',
        threshold: 70,
        availableMetrics: ['accuracy', 'f1'],
      }),
    ]);
  });

  it('should clamp an oversized saved limit to the provider dataset size on init', async () => {
    const result = renderForm({
      sourceCollection: {
        ...sourceCollection,
        benchmarks: [
          {
            ...sourceCollection.benchmarks![0],
            parameters: { limit: 1500, num_few_shot: 3 },
          },
        ],
      },
    });

    await waitFor(() => expect(result.result.current.benchmarks[0].numSamples).toBe(1000));

    expect(result.result.current.benchmarks[0]).toEqual(
      expect.objectContaining({
        numSamples: 1000,
        datasetSize: 1000,
      }),
    );
  });

  it('should default numSamples to dataset size when the collection has no saved limit', async () => {
    const result = renderForm({
      sourceCollection: {
        ...sourceCollection,
        benchmarks: [
          {
            id: 'benchmark-one',
            provider_id: 'provider-one',
            weight: 1,
            pass_criteria: { threshold: 0.75 },
          },
        ],
      },
    });

    await waitFor(() => expect(result.result.current.benchmarks[0].numSamples).toBe(1000));

    expect(result.result.current.benchmarks[0]).toEqual(
      expect.objectContaining({
        numSamples: 1000,
        datasetSize: 1000,
      }),
    );
  });

  it('should update suite and benchmark values', async () => {
    const result = renderForm();
    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    act(() => {
      result.result.current.setSuiteName('Updated suite');
      result.result.current.setSuiteDescription('Updated description');
      result.result.current.setSuiteCategory('coding');
      result.result.current.setSuiteEvaluates('traces');
      result.result.current.handleSuiteThresholdChange(65);
      result.result.current.updateBenchmark(0, 'numSamples', 500);
      result.result.current.updateBenchmark(0, 'threshold', 85);
    });

    expect(result.result.current.suiteName).toBe('Updated suite');
    expect(result.result.current.suiteDescription).toBe('Updated description');
    expect(result.result.current.suiteCategory).toBe('coding');
    expect(result.result.current.suiteEvaluates).toBe('traces');
    expect(result.result.current.suiteThreshold).toBe(65);
    expect(result.result.current.benchmarks[0]).toEqual(
      expect.objectContaining({ numSamples: 500, threshold: 85 }),
    );
  });

  it('should apply benchmark selection in alphabetical order regardless of key order', async () => {
    const result = renderForm();
    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    act(() =>
      result.result.current.applyBenchmarkSelection([
        'provider-two:benchmark-two',
        'provider-one:benchmark-one',
      ]),
    );
    expect(result.result.current.benchmarks).toHaveLength(2);
    expect(result.result.current.benchmarks[0].id).toBe('benchmark-one');
    expect(result.result.current.benchmarks[1].id).toBe('benchmark-two');
  });

  it('should preserve nonuniform weights when saving an unchanged catalog selection', async () => {
    const collectionWithNonuniformWeights: Collection = {
      ...sourceCollection,
      benchmarks: [
        { ...sourceCollection.benchmarks![0], weight: 0.8 },
        {
          id: 'benchmark-two',
          provider_id: 'provider-two',
          weight: 0.2,
          primary_score: { metric: 'accuracy', lower_is_better: false },
          pass_criteria: { threshold: 0.7 },
        },
      ],
    };
    const result = renderForm({ sourceCollection: collectionWithNonuniformWeights });

    await waitFor(() => expect(result.result.current.benchmarks).toHaveLength(2));
    expect(result.result.current.weightSegments).toEqual([
      expect.objectContaining({ label: 'Benchmark One', percentage: 80 }),
      expect.objectContaining({ label: 'Benchmark Two', percentage: 20 }),
    ]);
    const weightsBeforeSave = result.result.current.benchmarks.map(({ id, weight }) => ({
      id,
      weight,
    }));

    act(() =>
      result.result.current.applyBenchmarkSelection([
        'provider-two:benchmark-two',
        'provider-one:benchmark-one',
      ]),
    );

    expect(result.result.current.benchmarks.map(({ id, weight }) => ({ id, weight }))).toEqual(
      weightsBeforeSave,
    );
  });

  it('should normalize imported under-minimum weights before saving a suite', async () => {
    const collectionWithUnderMinimumWeight: Collection = {
      ...sourceCollection,
      benchmarks: [
        { ...sourceCollection.benchmarks![0], weight: 0.01 },
        {
          id: 'benchmark-two',
          provider_id: 'provider-two',
          weight: 0.99,
          primary_score: { metric: 'accuracy', lower_is_better: false },
          pass_criteria: { threshold: 0.7 },
        },
      ],
    };
    const cloneFetcher = jest.fn().mockResolvedValue({
      resource: { id: 'saved-collection' },
      name: 'Saved suite',
    } as Collection);
    mockCloneCollection.mockReturnValue(cloneFetcher);
    const result = renderForm({ sourceCollection: collectionWithUnderMinimumWeight });

    await waitFor(() => expect(result.result.current.benchmarks).toHaveLength(2));
    expect(result.result.current.benchmarks.map((benchmark) => benchmark.weight)).toEqual([
      0.05, 0.95,
    ]);

    await act(async () => {
      await result.result.current.handleSaveOnly();
    });

    expect(mockCloneCollection).toHaveBeenCalledWith(
      '',
      'test-namespace',
      'source-collection',
      expect.objectContaining({
        benchmarks: [
          expect.objectContaining({ id: 'benchmark-one', weight: 0.05 }),
          expect.objectContaining({ id: 'benchmark-two', weight: 0.95 }),
        ],
      }),
    );
  });

  it('should apply benchmark selection and prevent an empty suite', async () => {
    const result = renderForm();
    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    act(() =>
      result.result.current.applyBenchmarkSelection([
        'provider-one:benchmark-one',
        'provider-two:benchmark-two',
      ]),
    );
    expect(result.result.current.benchmarks).toHaveLength(2);
    expect(result.result.current.benchmarks[0].weight).toBe(0.5);
    expect(result.result.current.benchmarks[1]).toEqual(
      expect.objectContaining({ id: 'benchmark-two', weight: 0.5 }),
    );

    act(() => result.result.current.applyBenchmarkSelection(['provider-two:benchmark-two']));
    expect(result.result.current.benchmarks).toHaveLength(1);
    expect(result.result.current.benchmarks[0].id).toBe('benchmark-two');
    expect(result.result.current.benchmarks[0].weight).toBe(1);

    act(() => result.result.current.applyBenchmarkSelection([]));
    expect(result.result.current.benchmarks).toHaveLength(1);
  });

  it('should be invalid when the suite name or benchmark list is empty', async () => {
    const result = renderForm({ sourceCollection: undefined });

    expect(result.result.current.isValid).toBe(false);
    expect(result.result.current.isSettingsValid).toBe(false);

    act(() => result.result.current.setSuiteName('New suite'));
    expect(result.result.current.isSettingsValid).toBe(true);
    expect(result.result.current.isValid).toBe(false);

    act(() => result.result.current.applyBenchmarkSelection(['provider-two:benchmark-two']));
    await waitFor(() => expect(result.result.current.isValid).toBe(true));

    act(() => result.result.current.setSuiteName('   '));
    expect(result.result.current.isValid).toBe(false);
  });

  it('should invoke onSaveAndRunRequest instead of cloning when provided', async () => {
    const onSaveAndRunRequest = jest.fn();
    const result = renderForm({ onSaveAndRunRequest });
    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    act(() => {
      result.result.current.handleSaveAndRun();
    });

    expect(onSaveAndRunRequest).toHaveBeenCalled();
    expect(mockCloneCollection).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should block saves when advanced benchmark parameters are invalid JSON', async () => {
    const onSaveAndRunRequest = jest.fn();
    const result = renderForm({ onSaveAndRunRequest });
    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    act(() => result.result.current.updateBenchmark(0, 'additionalParameters', '{not valid JSON'));

    await waitFor(() =>
      expect(
        result.result.current.form.formState.errors.benchmarks?.[0]?.additionalParameters?.message,
      ).toBe('Advanced benchmark parameters must be valid JSON.'),
    );
    expect(result.result.current.isValid).toBe(false);

    act(() => result.result.current.handleSaveAndRun());
    await act(async () => {
      await result.result.current.handleSaveOnly();
      await result.result.current.cloneCollectionForRun();
    });

    expect(onSaveAndRunRequest).not.toHaveBeenCalled();
    expect(mockCloneCollection).not.toHaveBeenCalled();
  });

  it('should reject reserved advanced parameters and preserve dedicated values defensively', async () => {
    const result = renderForm();
    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    act(() =>
      result.result.current.updateBenchmark(
        0,
        'additionalParameters',
        '{"limit": 999, "num_fewshot": 20, "blocking_subtask": "harmless"}',
      ),
    );

    await waitFor(() =>
      expect(
        result.result.current.form.formState.errors.benchmarks?.[0]?.additionalParameters?.message,
      ).toBe('Use the dedicated fields for limit, num_fewshot.'),
    );

    const pending = result.result.current.buildPendingCollection();
    expect(pending?.benchmarks?.[0].parameters).toEqual({
      limit: 250,
      num_few_shot: 3,
      blocking_subtask: 'harmless',
    });

    await act(async () => {
      await result.result.current.handleSaveOnly();
    });
    expect(mockCloneCollection).not.toHaveBeenCalled();
  });

  it('should clone a collection for run via cloneCollectionForRun', async () => {
    const clonedCollection: Collection = {
      resource: { id: 'cloned-collection' },
      name: 'Curated suite copy',
      benchmarks: sourceCollection.benchmarks,
    };
    const cloneFetcher = jest.fn().mockResolvedValue(clonedCollection);
    mockCloneCollection.mockReturnValue(cloneFetcher);
    const result = renderForm();
    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    act(() => result.result.current.setSuiteEvaluates('traces'));

    let cloned: Collection | undefined;
    await act(async () => {
      cloned = await result.result.current.cloneCollectionForRun();
    });

    expect(mockCloneCollection).toHaveBeenCalledWith(
      '',
      'test-namespace',
      'source-collection',
      expect.objectContaining({
        name: expect.stringMatching(defaultSuiteNamePattern),
        description: 'A curated description',
        category: 'language',
        ai_entities: ['traces'],
        custom: { source: 'curated' },
        pass_criteria: { threshold: 0.8 },
        benchmarks: [
          expect.objectContaining({
            id: 'benchmark-one',
            provider_id: 'provider-one',
            weight: 1,
            primary_score: { metric: 'accuracy', lower_is_better: false },
            pass_criteria: { threshold: 0.75 },
            parameters: { limit: 250, num_few_shot: 3 },
          }),
        ],
      }),
    );
    expect(cloneFetcher).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
    expect(cloned).toEqual(clonedCollection);
    expect(mockFireMiscTrackingEvent).toHaveBeenCalled();
  });

  it('should abort a run clone when its parent request is cancelled', async () => {
    const deferredClone = createDeferred<Collection>();
    let requestSignal: AbortSignal | undefined;
    const cloneFetcher = jest.fn((options: { signal?: AbortSignal }) => {
      requestSignal = options.signal;
      return deferredClone.promise;
    });
    mockCloneCollection.mockReturnValue(cloneFetcher);
    const result = renderForm();
    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    const parentController = new AbortController();
    let clonePromise = Promise.resolve<Collection | undefined>(undefined);
    act(() => {
      clonePromise = result.result.current.cloneCollectionForRun(parentController.signal);
    });

    await waitFor(() => expect(cloneFetcher).toHaveBeenCalledTimes(1));
    expect(requestSignal?.aborted).toBe(false);

    parentController.abort();
    expect(requestSignal?.aborted).toBe(true);

    await act(async () => {
      deferredClone.resolve({ resource: { id: 'cloned-collection' }, name: 'Copied suite' });
      await clonePromise;
    });

    await expect(clonePromise).resolves.toBeUndefined();
    expect(mockNotification.error).not.toHaveBeenCalled();
    expect(mockFireMiscTrackingEvent).not.toHaveBeenCalled();
  });

  it('should build a pending collection from current form state', async () => {
    const result = renderForm();
    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    act(() => result.result.current.setSuiteEvaluates('guardrails'));
    const pending = result.result.current.buildPendingCollection();

    expect(pending).toEqual(
      expect.objectContaining({
        resource: sourceCollection.resource,
        name: expect.stringMatching(defaultSuiteNamePattern),
        description: 'A curated description',
        category: 'language',
        ai_entities: ['guardrails'],
        custom: { source: 'curated' },
        pass_criteria: { threshold: 0.8 },
        benchmarks: [
          expect.objectContaining({
            id: 'benchmark-one',
            provider_id: 'provider-one',
            weight: 1,
          }),
        ],
      }),
    );
    expect(sourceCollection.custom).toEqual({ source: 'curated', evaluates: ['model'] });
  });

  it('should preserve a true lower-is-better setting when cloning a suite', async () => {
    const sourceWithLowerIsBetter: Collection = {
      ...sourceCollection,
      benchmarks: [
        {
          ...sourceCollection.benchmarks![0],
          primary_score: { metric: 'accuracy', lower_is_better: true },
        },
      ],
    };
    const clonedCollection: Collection = {
      resource: { id: 'cloned-collection' },
      name: 'Curated suite copy',
    };
    const cloneFetcher = jest.fn().mockResolvedValue(clonedCollection);
    mockCloneCollection.mockReturnValue(cloneFetcher);
    const result = renderForm({ sourceCollection: sourceWithLowerIsBetter });
    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    expect(result.result.current.benchmarks[0]).toEqual(
      expect.objectContaining({ lowerIsBetter: true }),
    );

    await act(async () => {
      await result.result.current.handleSaveOnly();
    });

    expect(mockCloneCollection).toHaveBeenCalledWith(
      '',
      'test-namespace',
      'source-collection',
      expect.objectContaining({
        benchmarks: [
          expect.objectContaining({
            primary_score: { metric: 'accuracy', lower_is_better: true },
          }),
        ],
      }),
    );
  });

  it('should save a clone and return to the benchmark suites page', async () => {
    const clonedCollection: Collection = {
      resource: { id: 'saved-collection' },
      name: 'Saved suite',
    };
    const cloneFetcher = jest.fn().mockResolvedValue(clonedCollection);
    mockCloneCollection.mockReturnValue(cloneFetcher);
    const result = renderForm();
    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    await act(async () => {
      await result.result.current.handleSaveOnly();
    });

    expect(mockNotification.success).toHaveBeenCalledWith(
      'Suite saved',
      '"Saved suite" has been added to your benchmark suites.',
    );
    expect(mockNavigate).toHaveBeenCalledWith('/evaluation/test-namespace/create/collections');
  });

  it('should remain submitting while a save-only clone is pending', async () => {
    const deferredClone = createDeferred<Collection>();
    const cloneFetcher = jest.fn(() => deferredClone.promise);
    mockCloneCollection.mockReturnValue(cloneFetcher);
    const result = renderForm();
    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    let savePromise = Promise.resolve();
    act(() => {
      savePromise = result.result.current.handleSaveOnly();
    });

    await waitFor(() => {
      expect(cloneFetcher).toHaveBeenCalledTimes(1);
      expect(result.result.current.isSubmitting).toBe(true);
    });

    await act(async () => {
      deferredClone.resolve({ resource: { id: 'saved-collection' }, name: 'Saved suite' });
      await savePromise;
    });

    expect(result.result.current.isSubmitting).toBe(false);
  });

  it('should lock immediately and avoid duplicate save-only clones during validation', async () => {
    const deferredValidation = createDeferred<boolean>();
    const deferredClone = createDeferred<Collection>();
    const cloneFetcher = jest.fn(() => deferredClone.promise);
    mockCloneCollection.mockReturnValue(cloneFetcher);
    const result = renderForm();
    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));
    jest.spyOn(result.result.current.form, 'trigger').mockReturnValue(deferredValidation.promise);

    let firstSave = Promise.resolve();
    let secondSave = Promise.resolve();
    act(() => {
      firstSave = result.result.current.handleSaveOnly();
      secondSave = result.result.current.handleSaveOnly();
    });

    expect(result.result.current.isSubmitting).toBe(true);
    expect(cloneFetcher).not.toHaveBeenCalled();

    await act(async () => {
      deferredValidation.resolve(true);
      await Promise.resolve();
    });
    await waitFor(() => expect(cloneFetcher).toHaveBeenCalledTimes(1));

    await act(async () => {
      deferredClone.resolve({ resource: { id: 'saved-collection' }, name: 'Saved suite' });
      await Promise.all([firstSave, secondSave]);
    });

    expect(result.result.current.isSubmitting).toBe(false);
  });

  it('should clear the save-only lock if validation rejects', async () => {
    const result = renderForm();
    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));
    jest
      .spyOn(result.result.current.form, 'trigger')
      .mockRejectedValue(new Error('Validation unavailable'));

    await act(async () => {
      await result.result.current.handleSaveOnly();
    });

    expect(result.result.current.isSubmitting).toBe(false);
    expect(mockCloneCollection).not.toHaveBeenCalled();
    expect(mockNotification.error).not.toHaveBeenCalled();
  });

  it('should report clone failures from cloneCollectionForRun', async () => {
    const cloneFetcher = jest.fn().mockRejectedValue(new Error('Clone failed'));
    mockCloneCollection.mockReturnValue(cloneFetcher);
    const result = renderForm();
    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    let cloned: Collection | undefined;
    await act(async () => {
      cloned = await result.result.current.cloneCollectionForRun();
    });

    expect(mockNotification.error).toHaveBeenCalledWith('Failed to copy suite', 'Clone failed');
    expect(cloned).toBeUndefined();
  });

  it('should navigate back without calling the clone API when cancelled', () => {
    const result = renderForm();

    act(() => result.result.current.handleCancel());

    expect(mockNavigate).toHaveBeenCalledWith('/evaluation/test-namespace/create/collections');
    expect(mockCloneCollection).not.toHaveBeenCalled();
  });
});
