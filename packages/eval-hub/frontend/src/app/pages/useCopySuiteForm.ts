import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { sortBenchmarksByName } from '~/app/utilities/benchmarkListFilters';
import { normalizeThreshold } from '~/app/utilities/evaluationUtils';
import { weightsToPercentages } from '~/app/utilities/weightDistributionUtils';
import { evaluationCollectionsRoute } from '~/app/routes';
import { useNotification } from '~/app/hooks/useNotification';
import { cloneCollection, createCollection } from '~/app/api/k8s';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import { isSuiteEvaluatesOption, type SuiteEvaluatesOption } from '~/app/pages/const';
import {
  copySuiteDefaultValues,
  copySuiteSchema,
  RESERVED_BENCHMARK_PARAMETER_KEYS,
  type CopySuiteFormValues,
} from '~/app/schemas/copySuite.schema';
import type {
  Collection,
  CollectionBenchmark,
  CreateCollectionRequest,
  Provider,
  ProviderBenchmark,
} from '~/app/types';

const DEFAULT_SUITE_THRESHOLD = 70;
const MIN_WEIGHT_PERCENT = 5;
const RESERVED_PARAMETER_KEYS = new Set<string>(RESERVED_BENCHMARK_PARAMETER_KEYS);
export const MAX_BENCHMARKS = 10;

export type CopySuiteBenchmark = CopySuiteFormValues['benchmarks'][number];

export const getBenchmarkKey = (benchmark: { providerId: string; id: string }): string =>
  `${benchmark.providerId}:${benchmark.id}`;

export const clampNumSamples = (
  value: number | undefined,
  datasetSize?: number,
): number | undefined => {
  if (value == null || Number.isNaN(value)) {
    return undefined;
  }
  let clamped = Math.max(1, value);
  if (datasetSize != null) {
    clamped = Math.min(datasetSize, clamped);
  }
  return clamped;
};

const extractNumFewShot = (parameters?: Record<string, unknown>): number | undefined => {
  /* eslint-disable camelcase */
  if (parameters?.num_few_shot != null) {
    return Number(parameters.num_few_shot);
  }
  if (parameters?.num_fewshot != null) {
    return Number(parameters.num_fewshot);
  }
  /* eslint-enable camelcase */
  return undefined;
};

const extractAdditionalParameters = (parameters?: Record<string, unknown>): string => {
  if (!parameters) {
    return '';
  }
  /* eslint-disable camelcase */
  const extra = Object.fromEntries(
    Object.entries(parameters).filter(([key]) => !RESERVED_PARAMETER_KEYS.has(key)),
  );
  /* eslint-enable camelcase */
  return Object.keys(extra).length > 0 ? JSON.stringify(extra, null, 2) : '';
};

const parseAdditionalParameters = (value: string | undefined): Record<string, unknown> => {
  if (!value?.trim()) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(([key]) => !RESERVED_PARAMETER_KEYS.has(key)),
    );
  } catch {
    return {};
  }
};

const mergeBenchmarkParameters = (benchmark: CopySuiteBenchmark): Record<string, unknown> => ({
  ...parseAdditionalParameters(benchmark.additionalParameters),
  ...(benchmark.numSamples != null
    ? {
        // eslint-disable-next-line camelcase
        num_examples: benchmark.numSamples,
      }
    : {}),
  ...(benchmark.numFewShot != null
    ? {
        // eslint-disable-next-line camelcase
        num_few_shot: benchmark.numFewShot,
      }
    : {}),
});

const buildCustomMetadata = (sourceCustom: unknown): Record<string, unknown> =>
  Object.fromEntries(
    typeof sourceCustom === 'object' && sourceCustom !== null && !Array.isArray(sourceCustom)
      ? Object.entries(sourceCustom).filter(([key]) => key !== 'evaluates')
      : [],
  );

const uniqueCollectionMetadata = (values: string[] | undefined): string[] => [
  ...new Set(values ?? []),
];

type UseCopySuiteFormParams = {
  namespace: string | undefined;
  sourceCollection: Collection | undefined;
  providers: Provider[];
  providersLoaded: boolean;
  mode?: 'copy' | 'create';
  onSaveAndRunRequest?: () => void;
};

type BuildPendingCollectionParams = {
  sourceCollection: Collection;
  suiteName: string;
  suiteDescription: string;
  suiteDomains: string[];
  suiteTasks: string[];
  suiteModalities: string[];
  suiteIndustries: string[];
  suiteEvaluates: SuiteEvaluatesOption[];
  suiteThreshold: number;
  benchmarks: CopySuiteBenchmark[];
};

export const buildPendingCollection = ({
  sourceCollection,
  suiteName,
  suiteDescription,
  suiteDomains,
  suiteTasks,
  suiteModalities,
  suiteIndustries,
  suiteEvaluates,
  suiteThreshold,
  benchmarks,
}: BuildPendingCollectionParams): Collection => {
  /* eslint-disable camelcase */
  const normalizedBenchmarks: CollectionBenchmark[] = benchmarks.map((b) => {
    const parameters = mergeBenchmarkParameters(b);
    return {
      id: b.id,
      provider_id: b.providerId || undefined,
      weight: b.weight,
      primary_score: b.primaryMetric
        ? { metric: b.primaryMetric, lower_is_better: b.lowerIsBetter ?? false }
        : undefined,
      pass_criteria: { threshold: b.threshold / 100 },
      parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
    };
  });
  /* eslint-enable camelcase */

  return {
    ...sourceCollection,
    name: suiteName.trim(),
    description: suiteDescription.trim() || undefined,
    domains: suiteDomains,
    tasks: suiteTasks,
    modalities: suiteModalities,
    industries: suiteIndustries,
    // eslint-disable-next-line camelcase
    ai_entities: suiteEvaluates,
    custom: buildCustomMetadata(sourceCollection.custom),
    // eslint-disable-next-line camelcase
    pass_criteria: { threshold: suiteThreshold / 100 },
    benchmarks: normalizedBenchmarks,
  };
};

const resolveProviderBenchmark = (
  cb: CollectionBenchmark,
  providers: Provider[],
): ProviderBenchmark | undefined => {
  for (const provider of providers) {
    if (provider.resource.id === cb.provider_id) {
      return provider.benchmarks?.find((pb) => pb.id === cb.id);
    }
  }
  for (const provider of providers) {
    const match = provider.benchmarks?.find((pb) => pb.id === cb.id);
    if (match) {
      return match;
    }
  }
  return undefined;
};

const normalizeWeights = (weights: number[]): number[] => {
  if (weights.length === 0) {
    return [];
  }

  const nonNegativeWeights = weights.map((weight) =>
    Number.isFinite(weight) ? Math.max(0, weight) : 0,
  );
  const total = nonNegativeWeights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) {
    return equalWeights(weights.length);
  }

  let normalizedTotal = 0;
  const normalizedWeights = nonNegativeWeights.map((weight, index) => {
    if (index === weights.length - 1) {
      return 1 - normalizedTotal;
    }
    const normalizedWeight = weight / total;
    normalizedTotal += normalizedWeight;
    return normalizedWeight;
  });

  const minimumWeight = Math.min(MIN_WEIGHT_PERCENT / 100, 1 / normalizedWeights.length);
  const totalDeficit = normalizedWeights.reduce(
    (sum, weight) => sum + Math.max(0, minimumWeight - weight),
    0,
  );
  if (totalDeficit === 0) {
    return normalizedWeights;
  }

  const totalAvailableWeight = normalizedWeights.reduce(
    (sum, weight) => sum + Math.max(0, weight - minimumWeight),
    0,
  );
  if (totalAvailableWeight <= totalDeficit) {
    return equalWeights(weights.length);
  }

  const weightsWithMinimum = normalizedWeights.map((weight) =>
    weight < minimumWeight
      ? minimumWeight
      : weight - ((weight - minimumWeight) / totalAvailableWeight) * totalDeficit,
  );
  const largestWeightIndex = weightsWithMinimum.reduce(
    (largestIndex, weight, index) =>
      weight > (weightsWithMinimum[largestIndex] ?? 0) ? index : largestIndex,
    0,
  );
  weightsWithMinimum[largestWeightIndex] +=
    1 - weightsWithMinimum.reduce((sum, weight) => sum + weight, 0);

  return weightsWithMinimum;
};

const resolveInitialEvaluates = (
  collection: Collection,
  providers: Provider[],
): SuiteEvaluatesOption[] => {
  const normalizeEvaluates = (value: unknown): SuiteEvaluatesOption[] => {
    const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
    return [...new Set(values.filter(isSuiteEvaluatesOption))];
  };

  const aiEntities = normalizeEvaluates(collection.ai_entities);
  if (aiEntities.length > 0) {
    return aiEntities;
  }

  const customEvaluates = normalizeEvaluates(collection.custom?.evaluates);
  if (customEvaluates.length > 0) {
    return customEvaluates;
  }

  for (const benchmark of collection.benchmarks ?? []) {
    const provider = providers.find((item) => item.resource.id === benchmark.provider_id);
    const match = provider?.agent?.evaluates?.find((value) => isSuiteEvaluatesOption(value));
    if (match) {
      return [match];
    }
  }

  return [];
};

const buildBenchmarkFromProvider = (
  provider: Provider,
  providerBenchmark: ProviderBenchmark,
): CopySuiteBenchmark => {
  const datasetSize = providerBenchmark.dataset_size ?? undefined;

  return {
    id: providerBenchmark.id,
    providerId: provider.resource.id,
    name: providerBenchmark.name || providerBenchmark.id,
    weight: 1,
    primaryMetric: providerBenchmark.primary_score?.metric ?? providerBenchmark.metrics?.[0],
    lowerIsBetter: providerBenchmark.primary_score?.lower_is_better,
    numSamples: clampNumSamples(datasetSize, datasetSize),
    datasetSize,
    numFewShot: providerBenchmark.num_few_shot,
    additionalParameters: '',
    threshold: providerBenchmark.pass_criteria
      ? normalizeThreshold(providerBenchmark.pass_criteria.threshold)
      : DEFAULT_SUITE_THRESHOLD,
    availableMetrics: providerBenchmark.metrics ?? [],
  };
};

export const createBenchmarkFromKey = (
  key: string,
  providers: Provider[],
): CopySuiteBenchmark | undefined => {
  const separatorIndex = key.indexOf(':');
  if (separatorIndex <= 0) {
    return undefined;
  }

  const providerId = key.slice(0, separatorIndex);
  const benchmarkId = key.slice(separatorIndex + 1);
  const provider = providers.find((item) => item.resource.id === providerId);
  const providerBenchmark = provider?.benchmarks?.find((item) => item.id === benchmarkId);
  if (!provider || !providerBenchmark) {
    return undefined;
  }

  return buildBenchmarkFromProvider(provider, providerBenchmark);
};

const buildInitialBenchmarks = (
  collection: Collection,
  providers: Provider[],
): CopySuiteBenchmark[] => {
  const sourceBenchmarks = collection.benchmarks ?? [];
  const normalizedWeights = normalizeWeights(sourceBenchmarks.map((cb) => cb.weight ?? 1));

  return sortBenchmarksByName(
    sourceBenchmarks.map((cb, index) => {
      const pb = resolveProviderBenchmark(cb, providers);
      const primaryScore = cb.primary_score ?? pb?.primary_score;
      const datasetSize = pb?.dataset_size ?? undefined;
      const initialNumSamples =
        cb.parameters?.num_examples != null
          ? Number(cb.parameters.num_examples)
          : cb.parameters?.limit != null
            ? Number(cb.parameters.limit)
            : (datasetSize ?? undefined);

      return {
        id: cb.id,
        providerId: cb.provider_id ?? '',
        name: pb?.name ?? cb.id,
        weight: normalizedWeights[index] ?? 0,
        primaryMetric: primaryScore?.metric,
        lowerIsBetter: primaryScore?.lower_is_better,
        numSamples: clampNumSamples(initialNumSamples, datasetSize),
        datasetSize,
        numFewShot: extractNumFewShot(cb.parameters) ?? pb?.num_few_shot ?? undefined,
        additionalParameters: extractAdditionalParameters(cb.parameters),
        threshold: cb.pass_criteria
          ? normalizeThreshold(cb.pass_criteria.threshold)
          : DEFAULT_SUITE_THRESHOLD,
        availableMetrics: pb?.metrics ?? [],
      };
    }),
  );
};

export const equalWeights = (count: number): number[] => {
  if (count <= 0) {
    return [];
  }

  const weight = 1 / count;
  return Array.from({ length: count }, (_, index) =>
    index === count - 1 ? 1 - weight * (count - 1) : weight,
  );
};

export const rebalanceWeights = (benchmarks: CopySuiteBenchmark[]): CopySuiteBenchmark[] => {
  const weights = equalWeights(benchmarks.length);
  return benchmarks.map((b, index) => ({ ...b, weight: weights[index] }));
};

const buildDefaultSuiteName = (sourceName: string): string =>
  `${sourceName} - ${new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })}`;

const buildInitialFormValues = (
  sourceCollection: Collection,
  providers: Provider[],
): CopySuiteFormValues => ({
  suiteName: buildDefaultSuiteName(sourceCollection.name),
  suiteDescription: sourceCollection.description ?? '',
  suiteDomains: uniqueCollectionMetadata(
    sourceCollection.domains ?? (sourceCollection.category ? [sourceCollection.category] : []),
  ),
  suiteTasks: uniqueCollectionMetadata(sourceCollection.tasks),
  suiteModalities: uniqueCollectionMetadata(sourceCollection.modalities),
  suiteIndustries: uniqueCollectionMetadata(sourceCollection.industries),
  suiteEvaluates: resolveInitialEvaluates(sourceCollection, providers),
  suiteThreshold: sourceCollection.pass_criteria
    ? normalizeThreshold(sourceCollection.pass_criteria.threshold)
    : DEFAULT_SUITE_THRESHOLD,
  benchmarks: buildInitialBenchmarks(sourceCollection, providers),
});

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function useCopySuiteForm({
  namespace,
  sourceCollection,
  providers,
  providersLoaded,
  mode = 'copy',
  onSaveAndRunRequest,
}: UseCopySuiteFormParams) {
  const navigate = useNavigate();
  const notification = useNotification();
  const isCreateMode = mode === 'create';

  const form = useForm<CopySuiteFormValues>({
    mode: 'onChange',
    resolver: zodResolver(copySuiteSchema),
    defaultValues: copySuiteDefaultValues,
  });
  const { isValid: isFormValid } = form.formState;

  const initializedRef = React.useRef(false);
  React.useEffect(() => {
    if (initializedRef.current || !providersLoaded || (!isCreateMode && !sourceCollection)) {
      return;
    }
    initializedRef.current = true;
    form.reset(
      sourceCollection
        ? buildInitialFormValues(sourceCollection, providers)
        : copySuiteDefaultValues,
    );
    void form.trigger();
  }, [sourceCollection, providers, providersLoaded, form, isCreateMode]);

  const [
    suiteName,
    suiteDescription,
    suiteDomains,
    suiteTasks,
    suiteModalities,
    suiteIndustries,
    suiteEvaluates,
    suiteThreshold,
    benchmarks,
  ] = useWatch({
    control: form.control,
    name: [
      'suiteName',
      'suiteDescription',
      'suiteDomains',
      'suiteTasks',
      'suiteModalities',
      'suiteIndustries',
      'suiteEvaluates',
      'suiteThreshold',
      'benchmarks',
    ],
  });

  const totalWeight = React.useMemo(
    () => benchmarks.reduce((sum, b) => sum + b.weight, 0),
    [benchmarks],
  );

  const weightSegments = React.useMemo(() => {
    const percentages = weightsToPercentages(benchmarks.map((b) => b.weight));
    return benchmarks.map((b, index) => ({
      label: b.name,
      weight: b.weight,
      percentage: percentages[index] ?? 0,
    }));
  }, [benchmarks]);

  const selectedBenchmarkKeys = React.useMemo(
    () => benchmarks.map((benchmark) => getBenchmarkKey(benchmark)),
    [benchmarks],
  );

  const setSuiteName = React.useCallback(
    (value: string) => form.setValue('suiteName', value, { shouldValidate: true }),
    [form],
  );
  const setSuiteDescription = React.useCallback(
    (value: string) => form.setValue('suiteDescription', value, { shouldValidate: true }),
    [form],
  );
  const setSuiteEvaluates = React.useCallback(
    (value: SuiteEvaluatesOption[]) =>
      form.setValue('suiteEvaluates', value, { shouldValidate: true }),
    [form],
  );
  const handleSuiteThresholdChange = React.useCallback(
    (value: number) => form.setValue('suiteThreshold', value, { shouldValidate: true }),
    [form],
  );

  const updateBenchmark = React.useCallback(
    (index: number, field: keyof CopySuiteBenchmark, value: unknown) => {
      const currentBenchmarks = form.getValues('benchmarks');
      form.setValue(
        'benchmarks',
        currentBenchmarks.map((b, i) => (i === index ? { ...b, [field]: value } : b)),
        { shouldValidate: true },
      );
    },
    [form],
  );

  const applyBenchmarkSelection = React.useCallback(
    (selectedKeys: string[]) => {
      if (selectedKeys.length === 0) {
        return;
      }

      const previousBenchmarks = form.getValues('benchmarks');
      const previousByKey = new Map(
        previousBenchmarks.map((benchmark) => [getBenchmarkKey(benchmark), benchmark]),
      );
      const selectedKeySet = new Set(selectedKeys);
      const selectionIsUnchanged =
        selectedKeySet.size === previousByKey.size &&
        [...selectedKeySet].every((key) => previousByKey.has(key));

      if (selectionIsUnchanged) {
        return;
      }

      const nextBenchmarks = [...selectedKeySet]
        .map((key) => previousByKey.get(key) ?? createBenchmarkFromKey(key, providers))
        .filter((benchmark): benchmark is CopySuiteBenchmark => benchmark !== undefined);

      if (nextBenchmarks.length === 0) {
        return;
      }

      form.setValue('benchmarks', rebalanceWeights(sortBenchmarksByName(nextBenchmarks)), {
        shouldValidate: true,
      });
    },
    [form, providers],
  );

  const handleWeightsChange = React.useCallback(
    (newWeights: number[]) => {
      const normalizedWeights = normalizeWeights(newWeights);
      const currentBenchmarks = form.getValues('benchmarks');
      form.setValue(
        'benchmarks',
        currentBenchmarks.map((b, i) =>
          i < normalizedWeights.length ? { ...b, weight: normalizedWeights[i] } : b,
        ),
        { shouldValidate: true },
      );
    },
    [form],
  );

  const isSettingsValid = suiteName.trim() !== '';

  const isValid = isSettingsValid && benchmarks.length > 0 && isFormValid;

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isSaveOnlyInFlightRef = React.useRef(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  const buildCloneRequest = React.useCallback(() => {
    const values = form.getValues();
    /* eslint-disable camelcase */
    const normalizedBenchmarks: CollectionBenchmark[] = values.benchmarks.map((b) => {
      const parameters = mergeBenchmarkParameters(b);
      return {
        id: b.id,
        provider_id: b.providerId || undefined,
        weight: b.weight,
        primary_score: b.primaryMetric
          ? { metric: b.primaryMetric, lower_is_better: b.lowerIsBetter ?? false }
          : undefined,
        pass_criteria: { threshold: b.threshold / 100 },
        parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
      };
    });
    /* eslint-enable camelcase */

    return {
      name: values.suiteName.trim(),
      description: values.suiteDescription.trim() || undefined,
      domains: values.suiteDomains,
      tasks: values.suiteTasks,
      modalities: values.suiteModalities,
      industries: values.suiteIndustries,
      // eslint-disable-next-line camelcase
      ai_entities: values.suiteEvaluates,
      custom: buildCustomMetadata(sourceCollection?.custom),
      // eslint-disable-next-line camelcase
      pass_criteria: { threshold: values.suiteThreshold / 100 },
      benchmarks: normalizedBenchmarks,
    };
  }, [form, sourceCollection]);

  const buildCreateRequest = React.useCallback(
    (): CreateCollectionRequest => ({
      ...buildCloneRequest(),
      custom: undefined,
    }),
    [buildCloneRequest],
  );

  const getPendingCollection = React.useCallback((): Collection | undefined => {
    if (!sourceCollection) {
      return undefined;
    }
    const values = form.getValues();
    return buildPendingCollection({
      sourceCollection,
      suiteName: values.suiteName,
      suiteDescription: values.suiteDescription,
      suiteDomains: values.suiteDomains,
      suiteTasks: values.suiteTasks,
      suiteModalities: values.suiteModalities,
      suiteIndustries: values.suiteIndustries,
      suiteEvaluates: values.suiteEvaluates,
      suiteThreshold: values.suiteThreshold,
      benchmarks: values.benchmarks,
    });
  }, [sourceCollection, form]);

  const cloneCollectionForRun = React.useCallback(
    async (parentSignal?: AbortSignal): Promise<Collection | undefined> => {
      if (
        !sourceCollection ||
        !namespace ||
        parentSignal?.aborted ||
        !(await form.trigger()) ||
        parentSignal?.aborted
      ) {
        return undefined;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const abortClone = () => controller.abort();
      parentSignal?.addEventListener('abort', abortClone, { once: true });

      try {
        const clonedCollection = await cloneCollection(
          '',
          namespace,
          sourceCollection.resource.id,
          buildCloneRequest(),
        )({ signal: controller.signal });

        if (controller.signal.aborted) {
          return undefined;
        }

        fireMiscTrackingEvent(EVAL_HUB_EVENTS.BENCHMARK_RUN_SELECTED, {
          runType: 'collection',
          collectionName: clonedCollection.name,
          benchmarkTypes: JSON.stringify((clonedCollection.benchmarks ?? []).map((b) => b.id)),
          countOfBenchmarks: clonedCollection.benchmarks?.length ?? 0,
        });

        return clonedCollection;
      } catch (e) {
        if (!controller.signal.aborted) {
          const message = e instanceof Error ? e.message : 'An unknown error occurred.';
          notification.error('Failed to copy suite', message);
        }
        return undefined;
      } finally {
        parentSignal?.removeEventListener('abort', abortClone);
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [sourceCollection, namespace, form, buildCloneRequest, notification],
  );

  const createCollectionForRun = React.useCallback(
    async (parentSignal?: AbortSignal): Promise<Collection | undefined> => {
      if (
        !isCreateMode ||
        !namespace ||
        parentSignal?.aborted ||
        !(await form.trigger()) ||
        parentSignal?.aborted
      ) {
        return undefined;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const abortCreate = () => controller.abort();
      parentSignal?.addEventListener('abort', abortCreate, { once: true });

      try {
        const createdCollection = await createCollection(
          '',
          namespace,
          buildCreateRequest(),
        )({
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return undefined;
        }

        fireMiscTrackingEvent(EVAL_HUB_EVENTS.BENCHMARK_RUN_SELECTED, {
          runType: 'collection',
          collectionName: createdCollection.name,
          benchmarkTypes: JSON.stringify((createdCollection.benchmarks ?? []).map((b) => b.id)),
          countOfBenchmarks: createdCollection.benchmarks?.length ?? 0,
        });

        return createdCollection;
      } catch (e) {
        if (!controller.signal.aborted) {
          const message = e instanceof Error ? e.message : 'An unknown error occurred.';
          notification.error('Failed to create suite', message);
        }
        return undefined;
      } finally {
        parentSignal?.removeEventListener('abort', abortCreate);
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [isCreateMode, namespace, form, buildCreateRequest, notification],
  );

  const handleSaveAndRun = React.useCallback(() => {
    if (!isValid || (!isCreateMode && !sourceCollection) || !namespace) {
      return;
    }
    onSaveAndRunRequest?.();
  }, [isCreateMode, isValid, sourceCollection, namespace, onSaveAndRunRequest]);

  const handleSaveOnly = React.useCallback(async () => {
    if (isSaveOnlyInFlightRef.current || (!isCreateMode && !sourceCollection) || !namespace) {
      return;
    }

    isSaveOnlyInFlightRef.current = true;
    setIsSubmitting(true);
    let controller: AbortController | undefined;

    try {
      if (!(await form.trigger())) {
        return;
      }

      controller = new AbortController();
      abortControllerRef.current = controller;
      const savedCollection = isCreateMode
        ? await createCollection('', namespace, buildCreateRequest())({ signal: controller.signal })
        : await cloneCollection(
            '',
            namespace,
            sourceCollection!.resource.id,
            buildCloneRequest(),
          )({ signal: controller.signal });

      notification.success(
        isCreateMode ? 'Suite created' : 'Suite saved',
        `"${savedCollection.name}" has been added to your benchmark suites.`,
      );
      navigate(evaluationCollectionsRoute(namespace));
    } catch (e) {
      if (controller && !controller.signal.aborted) {
        const message = e instanceof Error ? e.message : 'An unknown error occurred.';
        notification.error(
          isCreateMode ? 'Failed to create suite' : 'Failed to copy suite',
          message,
        );
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      isSaveOnlyInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    isCreateMode,
    sourceCollection,
    namespace,
    form,
    buildCreateRequest,
    buildCloneRequest,
    navigate,
    notification,
  ]);

  const handleCancel = React.useCallback(() => {
    navigate(evaluationCollectionsRoute(namespace));
  }, [navigate, namespace]);

  return {
    form,
    suiteName,
    setSuiteName,
    suiteDescription,
    setSuiteDescription,
    suiteDomains,
    suiteTasks,
    suiteModalities,
    suiteIndustries,
    suiteEvaluates,
    setSuiteEvaluates,
    suiteThreshold,
    handleSuiteThresholdChange,
    benchmarks,
    selectedBenchmarkKeys,
    totalWeight,
    weightSegments,
    updateBenchmark,
    applyBenchmarkSelection,
    handleWeightsChange,
    isSettingsValid,
    isValid,
    isSubmitting,
    handleSaveAndRun,
    handleSaveOnly,
    handleCancel,
    buildPendingCollection: getPendingCollection,
    cloneCollectionForRun,
    createCollectionForRun,
    minWeightPercent: MIN_WEIGHT_PERCENT,
  };
}
