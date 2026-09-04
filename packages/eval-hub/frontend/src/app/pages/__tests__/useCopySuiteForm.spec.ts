/* eslint-disable camelcase */
import { act, waitFor } from '@testing-library/react';
import { useNavigate } from 'react-router';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { renderHook } from '~/__tests__/unit/testUtils/hooks';
import { cloneCollection } from '~/app/api/k8s';
import { useNotification } from '~/app/hooks/useNotification';
import {
  useCopySuiteForm,
  clampNumSamples,
  type CopySuiteBenchmark,
} from '~/app/pages/useCopySuiteForm';
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

const sourceCollection: Collection = {
  resource: { id: 'source-collection' },
  name: 'Curated suite',
  description: 'A curated description',
  category: 'language',
  pass_criteria: { threshold: 0.8 },
  benchmarks: [
    {
      id: 'benchmark-one',
      provider_id: 'provider-one',
      weight: 1,
      primary_score: { metric: 'accuracy', lower_is_better: false },
      pass_criteria: { threshold: 0.75 },
      parameters: { limit: 250, num_fewshot: 3 },
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
];

const newBenchmark: CopySuiteBenchmark = {
  id: 'benchmark-two',
  providerId: 'provider-two',
  name: 'Benchmark Two',
  weight: 1,
  primaryMetric: 'accuracy',
  numSamples: 100,
  randomSeed: 2,
  threshold: 70,
  availableMetrics: ['accuracy'],
};

type FormParams = Parameters<typeof useCopySuiteForm>[0];

const defaultParams: FormParams = {
  namespace: 'test-namespace',
  sourceCollection,
  providers,
  providersLoaded: true,
};

const renderForm = (overrides: Partial<FormParams> = {}) =>
  renderHook(() => useCopySuiteForm({ ...defaultParams, ...overrides }));

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

    await waitFor(() => expect(result.result.current.suiteName).toBe('Curated suite'));

    expect(result.result.current.suiteDescription).toBe('A curated description');
    expect(result.result.current.suiteCategory).toBe('language');
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
        randomSeed: 3,
        threshold: 75,
        availableMetrics: ['accuracy', 'f1'],
      }),
    ]);
    expect(result.result.current.isValid).toBe(true);
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

    await waitFor(() => expect(result.result.current.suiteName).toBe('Curated suite'));

    expect(result.result.current.benchmarks).toEqual([
      expect.objectContaining({
        id: 'benchmark-one',
        name: 'Benchmark One',
        datasetSize: 1000,
        numSamples: 1000,
        randomSeed: 5,
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
            parameters: { limit: 1500, num_fewshot: 3 },
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
    await waitFor(() => expect(result.result.current.suiteName).toBe('Curated suite'));

    act(() => {
      result.result.current.setSuiteName('Updated suite');
      result.result.current.setSuiteDescription('Updated description');
      result.result.current.setSuiteCategory('coding');
      result.result.current.handleSuiteThresholdChange(65);
      result.result.current.updateBenchmark(0, 'numSamples', 500);
      result.result.current.updateBenchmark(0, 'threshold', 85);
    });

    expect(result.result.current.suiteName).toBe('Updated suite');
    expect(result.result.current.suiteDescription).toBe('Updated description');
    expect(result.result.current.suiteCategory).toBe('coding');
    expect(result.result.current.suiteThreshold).toBe(65);
    expect(result.result.current.benchmarks[0]).toEqual(
      expect.objectContaining({ numSamples: 500, threshold: 85 }),
    );
  });

  it('should add benchmarks and prevent removing the final benchmark', async () => {
    const result = renderForm();
    await waitFor(() => expect(result.result.current.suiteName).toBe('Curated suite'));

    act(() => result.result.current.addBenchmarks([newBenchmark]));
    expect(result.result.current.benchmarks).toHaveLength(2);
    expect(result.result.current.benchmarks[0].weight).toBe(0.5);
    expect(result.result.current.benchmarks[1]).toEqual(
      expect.objectContaining({ ...newBenchmark, weight: 0.5 }),
    );

    act(() => result.result.current.removeBenchmark(0));
    expect(result.result.current.benchmarks).toHaveLength(1);
    expect(result.result.current.benchmarks[0].id).toBe('benchmark-two');
    expect(result.result.current.benchmarks[0].weight).toBe(1);

    act(() => result.result.current.removeBenchmark(0));
    expect(result.result.current.benchmarks).toHaveLength(1);
  });

  it('should be invalid when the suite name or benchmark list is empty', async () => {
    const result = renderForm({ sourceCollection: undefined });

    expect(result.result.current.isValid).toBe(false);

    act(() => result.result.current.setSuiteName('New suite'));
    expect(result.result.current.isValid).toBe(false);

    act(() => result.result.current.setBenchmarks([newBenchmark]));
    expect(result.result.current.isValid).toBe(true);

    act(() => result.result.current.setSuiteName('   '));
    expect(result.result.current.isValid).toBe(false);
  });

  it('should submit a clone and navigate to the evaluation run page', async () => {
    const clonedCollection: Collection = {
      resource: { id: 'cloned-collection' },
      name: 'Curated suite copy',
      benchmarks: sourceCollection.benchmarks,
    };
    const cloneFetcher = jest.fn().mockResolvedValue(clonedCollection);
    mockCloneCollection.mockReturnValue(cloneFetcher);
    const result = renderForm();
    await waitFor(() => expect(result.result.current.suiteName).toBe('Curated suite'));

    await act(async () => {
      await result.result.current.handleSaveAndRun();
    });

    expect(mockCloneCollection).toHaveBeenCalledWith(
      '',
      'test-namespace',
      'source-collection',
      expect.objectContaining({
        name: 'Curated suite',
        description: 'A curated description',
        category: 'language',
        pass_criteria: { threshold: 0.8 },
        benchmarks: [
          expect.objectContaining({
            id: 'benchmark-one',
            provider_id: 'provider-one',
            weight: 1,
            primary_score: { metric: 'accuracy', lower_is_better: false },
            pass_criteria: { threshold: 0.75 },
            parameters: { limit: 250, num_fewshot: 3 },
          }),
        ],
      }),
    );
    expect(cloneFetcher).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
    expect(mockNavigate).toHaveBeenCalledWith(
      '/evaluation/test-namespace/create/start?type=collection&collectionId=cloned-collection',
      { state: { collection: clonedCollection } },
    );
    expect(mockFireMiscTrackingEvent).toHaveBeenCalled();
    expect(result.result.current.isSubmitting).toBe(false);
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
    await waitFor(() => expect(result.result.current.suiteName).toBe('Curated suite'));

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
    await waitFor(() => expect(result.result.current.suiteName).toBe('Curated suite'));

    await act(async () => {
      await result.result.current.handleSaveOnly();
    });

    expect(mockNotification.success).toHaveBeenCalledWith(
      'Suite saved',
      '"Saved suite" has been added to your benchmark suites.',
    );
    expect(mockNavigate).toHaveBeenCalledWith('/evaluation/test-namespace/create/collections');
  });

  it('should report clone failures without navigating', async () => {
    const cloneFetcher = jest.fn().mockRejectedValue(new Error('Clone failed'));
    mockCloneCollection.mockReturnValue(cloneFetcher);
    const result = renderForm();
    await waitFor(() => expect(result.result.current.suiteName).toBe('Curated suite'));

    await act(async () => {
      await result.result.current.handleSaveAndRun();
    });

    expect(mockNotification.error).toHaveBeenCalledWith('Failed to copy suite', 'Clone failed');
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(result.result.current.isSubmitting).toBe(false);
  });

  it('should navigate back without calling the clone API when cancelled', () => {
    const result = renderForm();

    act(() => result.result.current.handleCancel());

    expect(mockNavigate).toHaveBeenCalledWith('/evaluation/test-namespace/create/collections');
    expect(mockCloneCollection).not.toHaveBeenCalled();
  });
});
