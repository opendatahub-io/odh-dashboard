/* eslint-disable camelcase */
import { act, waitFor } from '@testing-library/react';
import { useNavigate } from 'react-router';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { renderHook } from '~/__tests__/unit/testUtils/hooks';
import { cloneCollection, createCollection } from '~/app/api/k8s';
import { useNotification } from '~/app/hooks/useNotification';
import {
  buildPendingCollection,
  createBenchmarkFromKey,
  updateBenchmarkParameter,
  useCopySuiteForm,
} from '~/app/pages/useCopySuiteForm';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import type { Collection, Provider } from '~/app/types';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('react-router', () => ({
  useNavigate: jest.fn(),
}));

jest.mock('~/app/api/k8s', () => ({
  cloneCollection: jest.fn(),
  createCollection: jest.fn(),
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
const mockCreateCollection = jest.mocked(createCollection);
const mockUseNotification = jest.mocked(useNotification);
const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);
const defaultSuiteNamePattern =
  /^Curated suite - [A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} (AM|PM)$/;

const sourceCollection: Collection = {
  resource: { id: 'source-collection' },
  name: 'Curated suite',
  description: 'A curated description',
  category: 'language',
  domains: ['reasoning', 'safety'],
  tasks: ['text-generation'],
  modalities: ['text'],
  industries: ['technology'],
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
      parameters: { num_examples: 250, num_few_shot: 3 },
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

describe('createBenchmarkFromKey', () => {
  it('should initialize provider benchmark runtime parameter defaults', () => {
    const benchmark = createBenchmarkFromKey('provider-one:benchmark-one', [
      {
        ...providers[0],
        benchmarks: [{ ...providers[0].benchmarks![0], num_few_shot: 0 }],
      },
    ]);

    expect(benchmark).toEqual(
      expect.objectContaining({
        parameters: [
          { key: 'num_examples', type: 'number', value: 1000 },
          { key: 'num_few_shot', type: 'number', value: 0 },
        ],
        additionalParameters: '',
      }),
    );

    expect(
      buildPendingCollection({
        sourceCollection,
        suiteName: 'New suite',
        suiteDescription: '',
        suiteDomains: [],
        suiteTasks: [],
        suiteModalities: [],
        suiteIndustries: [],
        suiteEvaluates: ['model'],
        suiteThreshold: 70,
        benchmarks: [benchmark!],
      }).benchmarks?.[0].parameters,
    ).toEqual({ num_examples: 1000, num_few_shot: 0 });
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
    expect(result.result.current.suiteDomains).toEqual(['reasoning', 'safety']);
    expect(result.result.current.suiteTasks).toEqual(['text-generation']);
    expect(result.result.current.suiteModalities).toEqual(['text']);
    expect(result.result.current.suiteIndustries).toEqual(['technology']);
    expect(result.result.current.suiteEvaluates).toEqual(['model']);
    expect(result.result.current.suiteThreshold).toBe(80);
    expect(result.result.current.benchmarks).toEqual([
      expect.objectContaining({
        id: 'benchmark-one',
        providerId: 'provider-one',
        name: 'Benchmark One',
        weight: 1,
        primaryMetric: 'accuracy',
        parameters: [
          { key: 'num_examples', type: 'number', value: 250 },
          { key: 'num_few_shot', type: 'number', value: 3 },
        ],
        additionalParameters: '',
        threshold: 75,
        availableMetrics: ['accuracy', 'f1'],
      }),
    ]);
    await waitFor(() => expect(result.result.current.isValid).toBe(true));
  });

  it('should fall back to another provider when the matching provider lacks the benchmark', async () => {
    const cloneFetcher = jest.fn().mockResolvedValue({
      resource: { id: 'saved-collection' },
      name: 'Saved suite',
    } as Collection);
    mockCloneCollection.mockReturnValue(cloneFetcher);
    const result = renderForm({
      sourceCollection: {
        ...sourceCollection,
        benchmarks: [
          {
            id: 'benchmark-two',
            provider_id: 'provider-one',
            weight: 1,
          },
        ],
      },
      providers: [{ ...providers[0], benchmarks: [] }, providers[1]],
    });

    await waitFor(() => expect(result.result.current.benchmarks).toHaveLength(1));

    expect(result.result.current.benchmarks[0]).toEqual(
      expect.objectContaining({
        id: 'benchmark-two',
        providerId: 'provider-two',
        name: 'Benchmark Two',
        availableMetrics: ['accuracy'],
      }),
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
            id: 'benchmark-two',
            provider_id: 'provider-two',
          }),
        ],
      }),
    );
  });

  it('should preserve multiple valid evaluates values while removing duplicates and invalid values', async () => {
    const result = renderForm({
      sourceCollection: {
        ...sourceCollection,
        ai_entities: ['model', 'agent', 'model', 'unsupported'],
      },
    });

    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    expect(result.result.current.suiteEvaluates).toEqual(['model', 'agent']);
  });

  it('should fall back to legacy evaluates metadata when ai entities are empty', async () => {
    const result = renderForm({
      sourceCollection: {
        ...sourceCollection,
        ai_entities: [],
        custom: { source: 'curated', evaluates: 'traces' },
      },
    });

    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    expect(result.result.current.suiteEvaluates).toEqual(['traces']);
  });

  it('should remove duplicate collection metadata values on initialization', async () => {
    const result = renderForm({
      sourceCollection: {
        ...sourceCollection,
        domains: ['reasoning', 'reasoning'],
        tasks: ['reasoning', 'reasoning'],
        modalities: ['text', 'text'],
        industries: ['technology', 'technology'],
      },
    });

    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    expect(result.result.current.suiteDomains).toEqual(['reasoning']);
    expect(result.result.current.suiteTasks).toEqual(['reasoning']);
    expect(result.result.current.suiteModalities).toEqual(['text']);
    expect(result.result.current.suiteIndustries).toEqual(['technology']);
  });

  it('should fall back to the source category when domains are absent', async () => {
    const result = renderForm({
      sourceCollection: { ...sourceCollection, domains: undefined, category: 'safety' },
    });

    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    expect(result.result.current.suiteDomains).toEqual(['safety']);
  });

  it('should preserve an explicitly empty domains array instead of falling back to category', async () => {
    const result = renderForm({
      sourceCollection: { ...sourceCollection, domains: [], category: 'safety' },
    });

    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    expect(result.result.current.suiteDomains).toEqual([]);
  });

  it('should create a blank suite through the create collection endpoint', async () => {
    const createdCollection = {
      resource: { id: 'created-collection' },
      name: 'New suite',
    } as Collection;
    const createFetcher = jest.fn().mockResolvedValue(createdCollection);
    mockCreateCollection.mockReturnValue(createFetcher);
    const result = renderForm({ mode: 'create', sourceCollection: undefined });

    await waitFor(() => expect(result.result.current.suiteName).toBe(''));
    expect(result.result.current.suiteEvaluates).toEqual([]);

    act(() => {
      result.result.current.form.setValue('suiteName', 'New suite', { shouldValidate: true });
      result.result.current.form.setValue('suiteDescription', 'A new suite', {
        shouldValidate: true,
      });
      result.result.current.form.setValue('suiteDomains', ['safety', 'reasoning'], {
        shouldValidate: true,
      });
      result.result.current.form.setValue('suiteEvaluates', ['model'], {
        shouldValidate: true,
      });
      result.result.current.form.setValue('benchmarks', [
        {
          id: 'benchmark-one',
          providerId: 'provider-one',
          name: 'Benchmark One',
          weight: 1,
          parameters: [],
          threshold: 70,
          availableMetrics: [],
        },
      ]);
    });

    await act(async () => {
      await result.result.current.handleSaveOnly();
    });

    expect(mockCreateCollection).toHaveBeenCalledWith(
      '',
      'test-namespace',
      expect.objectContaining({
        name: 'New suite',
        description: 'A new suite',
        domains: ['safety', 'reasoning'],
        ai_entities: ['model'],
        benchmarks: [
          expect.objectContaining({
            id: 'benchmark-one',
            provider_id: 'provider-one',
          }),
        ],
      }),
    );
    expect(mockCreateCollection).toHaveBeenCalledWith(
      '',
      'test-namespace',
      expect.not.objectContaining({ custom: expect.anything() }),
    );
    expect(createFetcher).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
    expect(mockNotification.success).toHaveBeenCalledWith(
      'Suite created',
      '"New suite" has been added to your benchmark suites.',
    );
    expect(mockNavigate).toHaveBeenCalledWith('/evaluation/test-namespace/collections');
    expect(mockCloneCollection).not.toHaveBeenCalled();
  });

  it('should submit an empty ai_entities array for a create suite with no evaluates selected', async () => {
    const createFetcher = jest.fn().mockResolvedValue({
      resource: { id: 'created-collection' },
      name: 'New suite',
    } as Collection);
    mockCreateCollection.mockReturnValue(createFetcher);
    const result = renderForm({ mode: 'create', sourceCollection: undefined });

    await waitFor(() => expect(result.result.current.suiteName).toBe(''));

    act(() => {
      result.result.current.form.setValue('suiteName', 'New suite', { shouldValidate: true });
      result.result.current.form.setValue('benchmarks', [
        {
          id: 'benchmark-one',
          providerId: 'provider-one',
          name: 'Benchmark One',
          weight: 1,
          parameters: [],
          threshold: 70,
          availableMetrics: [],
        },
      ]);
    });

    await act(async () => {
      await result.result.current.handleSaveOnly();
    });

    expect(mockCreateCollection).toHaveBeenCalledWith(
      '',
      'test-namespace',
      expect.objectContaining({
        ai_entities: [],
      }),
    );
    expect(mockCreateCollection.mock.calls[0]?.[2]).not.toHaveProperty('category');
    expect(mockCreateCollection.mock.calls[0]?.[2]).not.toHaveProperty('ai_entities', ['agent']);
  });

  it('should create a collection for a create-and-run flow', async () => {
    const createdCollection = {
      resource: { id: 'created-collection' },
      name: 'New suite',
      benchmarks: [{ id: 'benchmark-one' }],
    } as Collection;
    const createFetcher = jest.fn().mockResolvedValue(createdCollection);
    mockCreateCollection.mockReturnValue(createFetcher);
    const result = renderForm({ mode: 'create', sourceCollection: undefined });

    await waitFor(() => expect(result.result.current.suiteName).toBe(''));

    act(() => {
      result.result.current.form.setValue('suiteName', 'New suite', { shouldValidate: true });
      result.result.current.form.setValue('benchmarks', [
        {
          id: 'benchmark-one',
          providerId: 'provider-one',
          name: 'Benchmark One',
          weight: 1,
          parameters: [],
          threshold: 70,
          availableMetrics: [],
        },
      ]);
    });

    let resolvedCollection: Collection | undefined;
    await act(async () => {
      resolvedCollection = await result.result.current.createCollectionForRun();
    });

    expect(resolvedCollection).toBe(createdCollection);
    expect(mockCreateCollection).toHaveBeenCalledWith(
      '',
      'test-namespace',
      expect.objectContaining({ name: 'New suite' }),
    );
    expect(createFetcher).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
    expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.BENCHMARK_RUN_SELECTED,
      expect.objectContaining({
        runType: 'collection',
        collectionName: 'New suite',
        benchmarkTypes: JSON.stringify(['benchmark-one']),
        countOfBenchmarks: 1,
      }),
    );
  });

  it('should report create failures from a create-only save', async () => {
    const createFetcher = jest.fn().mockRejectedValue(new Error('Create failed'));
    mockCreateCollection.mockReturnValue(createFetcher);
    const result = renderForm({ mode: 'create', sourceCollection: undefined });

    await waitFor(() => expect(result.result.current.suiteName).toBe(''));

    act(() => {
      result.result.current.form.setValue('suiteName', 'New suite', { shouldValidate: true });
      result.result.current.form.setValue('benchmarks', [
        {
          id: 'benchmark-one',
          providerId: 'provider-one',
          name: 'Benchmark One',
          weight: 1,
          parameters: [],
          threshold: 70,
          availableMetrics: [],
        },
      ]);
    });

    await act(async () => {
      await result.result.current.handleSaveOnly();
    });

    expect(mockNotification.error).toHaveBeenCalledWith('Failed to create suite', 'Create failed');
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(result.result.current.isSubmitting).toBe(false);
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

    expect(result.result.current.suiteEvaluates).toEqual(['traces']);
  });

  it('should leave evaluates blank when the source has no evaluates metadata', async () => {
    const sourceWithoutEvaluates: Collection = {
      ...sourceCollection,
      ai_entities: undefined,
      custom: { source: 'curated' },
    };
    const result = renderForm({ sourceCollection: sourceWithoutEvaluates });

    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    expect(result.result.current.suiteEvaluates).toEqual([]);
  });

  it('should fall back to provider evaluates metadata when collection metadata is absent', async () => {
    const sourceWithoutEvaluates: Collection = {
      ...sourceCollection,
      ai_entities: undefined,
      custom: { source: 'curated' },
    };
    const providerWithEvaluates: Provider = {
      ...providers[0],
      agent: { evaluates: ['guardrails'] },
    };
    const result = renderForm({
      sourceCollection: sourceWithoutEvaluates,
      providers: [providerWithEvaluates, ...providers.slice(1)],
    });

    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    expect(result.result.current.suiteEvaluates).toEqual(['guardrails']);
  });

  it('should map returned primitive parameters to fields and keep other parameters in JSON', async () => {
    const collectionWithFewShotAlias: Collection = {
      ...sourceCollection,
      benchmarks: [
        {
          id: 'benchmark-one',
          provider_id: 'provider-one',
          weight: 1,
          primary_score: { metric: 'accuracy', lower_is_better: false },
          parameters: {
            num_examples: 250,
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
        parameters: [
          { key: 'blocking_subtask', type: 'text', value: 'harmless' },
          { key: 'blocking_subtask_threshold', type: 'number', value: 0.7 },
          { key: 'num_examples', type: 'number', value: 250 },
          { key: 'num_fewshot', type: 'number', value: 0 },
        ],
        additionalParameters: '',
      }),
    );
  });

  it('should retain complex parameters in advanced JSON while rendering primitive parameters', async () => {
    const result = renderForm({
      sourceCollection: {
        ...sourceCollection,
        benchmarks: [
          {
            ...sourceCollection.benchmarks![0],
            parameters: {
              secondary_metric: 'accuracy_amb',
              secondary_threshold: 0.7,
              enabled: true,
              nested: { mode: 'strict' },
            },
          },
        ],
      },
    });

    await waitFor(() => expect(result.result.current.benchmarks).toHaveLength(1));

    expect(result.result.current.benchmarks[0].parameters).toEqual([
      { key: 'enabled', type: 'boolean', value: true },
      { key: 'secondary_metric', type: 'text', value: 'accuracy_amb' },
      { key: 'secondary_threshold', type: 'number', value: 0.7 },
    ]);
    expect(result.result.current.benchmarks[0].additionalParameters).toBe(
      JSON.stringify({ nested: { mode: 'strict' } }, null, 2),
    );
  });

  it('should serialize edited dynamic values and omit cleared fields from the payload', async () => {
    const result = renderForm({
      sourceCollection: {
        ...sourceCollection,
        benchmarks: [
          {
            ...sourceCollection.benchmarks![0],
            parameters: {
              enabled: true,
              secondary_metric: 'accuracy_amb',
              secondary_threshold: 0.7,
              nested: { mode: 'strict' },
            },
          },
        ],
      },
    });

    await waitFor(() => expect(result.result.current.benchmarks).toHaveLength(1));

    act(() => {
      const [{ parameters: initialParameters }] = result.result.current.benchmarks;
      let parameters = initialParameters;
      parameters = updateBenchmarkParameter(parameters, 'enabled', 'false');
      parameters = updateBenchmarkParameter(parameters, 'secondary_threshold', '0.8');
      parameters = updateBenchmarkParameter(parameters, 'secondary_metric', '');
      result.result.current.updateBenchmark(0, 'parameters', parameters);
    });

    const pending = result.result.current.buildPendingCollection();
    expect(pending?.benchmarks?.[0].parameters).toEqual({
      enabled: false,
      nested: { mode: 'strict' },
      secondary_threshold: 0.8,
    });
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
        parameters: [],
        additionalParameters: '',
        primaryMetric: 'accuracy',
        threshold: 70,
        availableMetrics: ['accuracy', 'f1'],
      }),
    ]);
  });

  it('should treat limit as a regular dynamic parameter', async () => {
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

    expect(result.result.current.benchmarks[0]).toEqual(
      expect.objectContaining({
        parameters: [
          { key: 'limit', type: 'number', value: 1500 },
          { key: 'num_few_shot', type: 'number', value: 3 },
        ],
      }),
    );
  });

  it('should initialize an empty dynamic parameter list when the collection has no parameters', async () => {
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

    expect(result.result.current.benchmarks[0]).toEqual(
      expect.objectContaining({
        parameters: [],
        additionalParameters: '',
      }),
    );
  });

  it('should update suite and benchmark values', async () => {
    const result = renderForm();
    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    act(() => {
      result.result.current.setSuiteName('Updated suite');
      result.result.current.setSuiteDescription('Updated description');
      result.result.current.setSuiteEvaluates(['traces']);
      result.result.current.handleSuiteThresholdChange(65);
      const [benchmark] = result.result.current.benchmarks;
      result.result.current.updateBenchmark(
        0,
        'parameters',
        updateBenchmarkParameter(benchmark.parameters, 'num_examples', '500'),
      );
      result.result.current.updateBenchmark(0, 'threshold', 85);
    });

    expect(result.result.current.suiteName).toBe('Updated suite');
    expect(result.result.current.suiteDescription).toBe('Updated description');
    expect(result.result.current.suiteEvaluates).toEqual(['traces']);
    expect(result.result.current.suiteThreshold).toBe(65);
    expect(result.result.current.benchmarks[0]).toEqual(
      expect.objectContaining({
        parameters: [
          { key: 'num_examples', type: 'number', value: 500 },
          { key: 'num_few_shot', type: 'number', value: 3 },
        ],
        threshold: 85,
      }),
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
    await waitFor(() => expect(result.result.current.isValid).toBe(true));

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
        '{"num_examples": 999, "num_few_shot": 20, "blocking_subtask": "harmless"}',
      ),
    );

    await waitFor(() =>
      expect(
        result.result.current.form.formState.errors.benchmarks?.[0]?.additionalParameters?.message,
      ).toBe('Use the dedicated fields for num_examples, num_few_shot.'),
    );

    const pending = result.result.current.buildPendingCollection();
    expect(pending?.benchmarks?.[0].parameters).toEqual({
      num_examples: 250,
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

    act(() => result.result.current.setSuiteEvaluates(['traces']));

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
        domains: ['reasoning', 'safety'],
        tasks: ['text-generation'],
        modalities: ['text'],
        industries: ['technology'],
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
            parameters: { num_examples: 250, num_few_shot: 3 },
          }),
        ],
      }),
    );
    expect(cloneFetcher).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
    expect(cloned).toEqual(clonedCollection);
    expect(mockFireMiscTrackingEvent).toHaveBeenCalled();
  });

  it('should send explicit empty metadata arrays when all values are removed', async () => {
    const cloneFetcher = jest.fn().mockResolvedValue({
      resource: { id: 'saved-collection' },
      name: 'Saved suite',
    } as Collection);
    mockCloneCollection.mockReturnValue(cloneFetcher);
    const result = renderForm();
    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    act(() => {
      result.result.current.form.setValue('suiteDomains', [], { shouldValidate: true });
      result.result.current.form.setValue('suiteTasks', [], { shouldValidate: true });
      result.result.current.form.setValue('suiteModalities', [], { shouldValidate: true });
      result.result.current.form.setValue('suiteIndustries', [], { shouldValidate: true });
      result.result.current.form.setValue('suiteEvaluates', [], { shouldValidate: true });
    });

    await act(async () => {
      await result.result.current.handleSaveOnly();
    });

    expect(mockCloneCollection).toHaveBeenCalledWith(
      '',
      'test-namespace',
      'source-collection',
      expect.objectContaining({
        domains: [],
        tasks: [],
        modalities: [],
        industries: [],
        ai_entities: [],
      }),
    );
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

  it('should abort a create run when its parent request is cancelled', async () => {
    const deferredCreate = createDeferred<Collection>();
    let requestSignal: AbortSignal | undefined;
    const createFetcher = jest.fn((options: { signal?: AbortSignal }) => {
      requestSignal = options.signal;
      return deferredCreate.promise;
    });
    mockCreateCollection.mockReturnValue(createFetcher);
    const result = renderForm({ mode: 'create', sourceCollection: undefined });

    await waitFor(() => expect(result.result.current.suiteName).toBe(''));
    act(() => {
      result.result.current.form.setValue('suiteName', 'New suite', { shouldValidate: true });
      result.result.current.form.setValue('benchmarks', [
        {
          id: 'benchmark-one',
          providerId: 'provider-one',
          name: 'Benchmark One',
          weight: 1,
          parameters: [],
          threshold: 70,
          availableMetrics: [],
        },
      ]);
    });

    const parentController = new AbortController();
    let createPromise = Promise.resolve<Collection | undefined>(undefined);
    act(() => {
      createPromise = result.result.current.createCollectionForRun(parentController.signal);
    });

    await waitFor(() => expect(createFetcher).toHaveBeenCalledTimes(1));
    expect(requestSignal?.aborted).toBe(false);

    parentController.abort();
    expect(requestSignal?.aborted).toBe(true);

    await act(async () => {
      deferredCreate.resolve({ resource: { id: 'created-collection' }, name: 'New suite' });
      await createPromise;
    });

    await expect(createPromise).resolves.toBeUndefined();
    expect(mockNotification.error).not.toHaveBeenCalled();
    expect(mockFireMiscTrackingEvent).not.toHaveBeenCalled();
  });

  it('should build a pending collection from current form state', async () => {
    const result = renderForm();
    await waitFor(() => expect(result.result.current.suiteName).toMatch(defaultSuiteNamePattern));

    act(() => result.result.current.setSuiteEvaluates(['guardrails']));
    const pending = result.result.current.buildPendingCollection();

    expect(pending).toEqual(
      expect.objectContaining({
        resource: sourceCollection.resource,
        name: expect.stringMatching(defaultSuiteNamePattern),
        description: 'A curated description',
        category: 'language',
        domains: ['reasoning', 'safety'],
        tasks: ['text-generation'],
        modalities: ['text'],
        industries: ['technology'],
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
    expect(mockNavigate).toHaveBeenCalledWith('/evaluation/test-namespace/collections');
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

  it('should navigate back to evaluations without calling the clone API when a copy is cancelled', () => {
    const result = renderForm();

    act(() => result.result.current.handleCancel());

    expect(mockNavigate).toHaveBeenCalledWith('/evaluation/test-namespace');
    expect(mockCloneCollection).not.toHaveBeenCalled();
  });

  it('should navigate back to evaluations when a create suite is cancelled', () => {
    const result = renderForm({ mode: 'create', sourceCollection: undefined });

    act(() => result.result.current.handleCancel());

    expect(mockNavigate).toHaveBeenCalledWith('/evaluation/test-namespace');
  });

  it('should navigate back to the originating suite page when a cancel route is provided', () => {
    const result = renderForm({
      cancelRoute: '/evaluation/test-namespace/collections/model',
    });

    act(() => result.result.current.handleCancel());

    expect(mockNavigate).toHaveBeenCalledWith('/evaluation/test-namespace/collections/model');
  });
});
