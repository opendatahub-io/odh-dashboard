import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import isEqual from 'lodash-es/isEqual';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { sortBenchmarksByName } from '~/app/utilities/benchmarkListFilters';
import {
  getThresholdInputValue,
  getThresholdRequestValue,
  isPercentageMetric,
  normalizeThreshold,
} from '~/app/utilities/evaluationUtils';
import { weightsToPercentages } from '~/app/utilities/weightDistributionUtils';
import { evaluationBenchmarkSuitesRoute, evaluationsBaseRoute } from '~/app/routes';
import { useNotification } from '~/app/hooks/useNotification';
import { useCollectionsContext } from '~/app/context/CollectionsContext';
import { cloneCollection, createCollection, patchCollection } from '~/app/api/k8s';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import { isSuiteEvaluatesOption, type SuiteEvaluatesOption } from '~/app/pages/const';
import {
  copySuiteDefaultValues,
  getCopySuiteSchema,
  isSameAsSourceCollectionName,
  type CopySuiteBenchmarkParameter,
  type CopySuiteFormValues,
} from '~/app/schemas/copySuite.schema';
import type {
  Collection,
  CollectionBenchmark,
  CollectionPatchOperation,
  CreateCollectionRequest,
  Provider,
  ProviderBenchmark,
} from '~/app/types';

const DEFAULT_SUITE_THRESHOLD = 70;
const MIN_WEIGHT_PERCENT = 5;
export const MAX_BENCHMARKS = 10;
const EDIT_AFTER_RUN_ERROR = 'Benchmark suites cannot be edited after they have been run.';

export type CopySuiteBenchmark = CopySuiteFormValues['benchmarks'][number];

export const getBenchmarkKey = (benchmark: { providerId: string; id: string }): string =>
  `${benchmark.providerId}:${benchmark.id}`;

const isDynamicParameterValue = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

const splitBenchmarkParameters = (
  parameters?: Record<string, unknown>,
): { parameters: CopySuiteBenchmarkParameter[]; additionalParameters: string } => {
  const dynamicParameters: CopySuiteBenchmarkParameter[] = [];
  const additionalParameters: Record<string, unknown> = {};

  Object.entries(parameters ?? {}).forEach(([key, value]) => {
    if (isDynamicParameterValue(value)) {
      if (typeof value === 'number') {
        dynamicParameters.push({ key, type: 'number', value });
      } else if (typeof value === 'boolean') {
        dynamicParameters.push({ key, type: 'boolean', value });
      } else {
        dynamicParameters.push({ key, type: 'text', value });
      }
    } else {
      additionalParameters[key] = value;
    }
  });

  const sortedDynamicParameters = dynamicParameters.toSorted((left, right) =>
    left.key.localeCompare(right.key),
  );

  return {
    parameters: sortedDynamicParameters,
    additionalParameters:
      Object.keys(additionalParameters).length > 0
        ? JSON.stringify(additionalParameters, null, 2)
        : '',
  };
};

export const updateBenchmarkParameter = (
  parameters: CopySuiteBenchmarkParameter[],
  key: string,
  value: string | boolean,
): CopySuiteBenchmarkParameter[] =>
  parameters.map((parameter) => {
    if (parameter.key !== key) {
      return parameter;
    }

    if (value === '') {
      return { ...parameter, value: undefined };
    }

    if (parameter.type === 'number') {
      const numericValue = Number(value);
      return { ...parameter, value: Number.isFinite(numericValue) ? numericValue : undefined };
    }

    if (parameter.type === 'boolean') {
      if (typeof value === 'boolean') {
        return { ...parameter, value };
      }

      if (value === 'true') {
        return { ...parameter, value: true };
      }

      if (value === 'false') {
        return { ...parameter, value: false };
      }

      return { ...parameter, value: undefined };
    }

    return { ...parameter, value: String(value) };
  });

const parseAdditionalParameters = (
  value: string | undefined,
  dedicatedParameterKeys: ReadonlySet<string>,
): Record<string, unknown> => {
  if (!value?.trim()) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(([key]) => !dedicatedParameterKeys.has(key)),
    );
  } catch {
    return {};
  }
};

const normalizeDynamicParameterValue = (
  parameter: CopySuiteBenchmarkParameter,
): string | number | boolean | undefined => {
  if (parameter.value == null || parameter.value === '') {
    return undefined;
  }

  if (parameter.type === 'number') {
    const numericValue = Number(parameter.value);
    return Number.isFinite(numericValue) ? numericValue : undefined;
  }

  if (parameter.type === 'boolean') {
    if (typeof parameter.value === 'boolean') {
      return parameter.value;
    }
    const normalizedValue = String(parameter.value).trim().toLowerCase();
    if (normalizedValue === 'true') {
      return true;
    }
    if (normalizedValue === 'false') {
      return false;
    }
  }

  return String(parameter.value);
};

const mergeBenchmarkParameters = (benchmark: CopySuiteBenchmark): Record<string, unknown> => {
  const dedicatedParameterKeys = new Set(benchmark.parameters.map((parameter) => parameter.key));
  const dynamicParameters = Object.fromEntries(
    benchmark.parameters.flatMap((parameter) => {
      const value = normalizeDynamicParameterValue(parameter);
      return value === undefined ? [] : [[parameter.key, value]];
    }),
  );

  return {
    ...parseAdditionalParameters(benchmark.additionalParameters, dedicatedParameterKeys),
    ...dynamicParameters,
  };
};

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
  mode?: 'copy' | 'create' | 'edit';
  onSaveAndRunRequest?: () => void;
  cancelRoute?: string;
};

type BuildPendingCollectionParams = {
  sourceCollection?: Collection;
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
  const baseCollection = sourceCollection ?? { resource: { id: '' }, name: '' };
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
      pass_criteria: { threshold: getThresholdRequestValue(b.threshold, b.primaryMetric) },
      parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
    };
  });
  /* eslint-enable camelcase */

  return {
    ...baseCollection,
    name: suiteName.trim(),
    description: suiteDescription.trim() || undefined,
    domains: suiteDomains,
    tasks: suiteTasks,
    modalities: suiteModalities,
    industries: suiteIndustries,
    // eslint-disable-next-line camelcase
    evaluation_targets: suiteEvaluates,
    custom: buildCustomMetadata(baseCollection.custom),
    // eslint-disable-next-line camelcase
    pass_criteria: { threshold: suiteThreshold / 100 },
    benchmarks: normalizedBenchmarks,
  };
};

type ResolvedProviderBenchmark = ProviderBenchmark & {
  providerId: string;
};

const resolveProviderBenchmark = (
  cb: CollectionBenchmark,
  providers: Provider[],
): ResolvedProviderBenchmark | undefined => {
  for (const provider of providers) {
    if (provider.resource.id === cb.provider_id) {
      const match = provider.benchmarks?.find((pb) => pb.id === cb.id);
      if (match) {
        return { ...match, providerId: provider.resource.id };
      }
    }
  }
  for (const provider of providers) {
    const match = provider.benchmarks?.find((pb) => pb.id === cb.id);
    if (match) {
      return { ...match, providerId: provider.resource.id };
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

  const evaluationTargets = normalizeEvaluates(collection.evaluation_targets);
  if (collection.evaluation_targets !== undefined) {
    return evaluationTargets;
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
  /* eslint-disable camelcase */
  const parameterState = splitBenchmarkParameters({
    ...(providerBenchmark.dataset_size != null
      ? { num_examples: providerBenchmark.dataset_size }
      : {}),
    ...(providerBenchmark.num_few_shot != null
      ? { num_few_shot: providerBenchmark.num_few_shot }
      : {}),
  });
  /* eslint-enable camelcase */

  return {
    id: providerBenchmark.id,
    providerId: provider.resource.id,
    name: providerBenchmark.name || providerBenchmark.id,
    weight: 1,
    primaryMetric: providerBenchmark.primary_score?.metric ?? providerBenchmark.metrics?.[0],
    lowerIsBetter: providerBenchmark.primary_score?.lower_is_better,
    parameters: parameterState.parameters,
    additionalParameters: parameterState.additionalParameters,
    threshold: providerBenchmark.pass_criteria
      ? getThresholdInputValue(
          providerBenchmark.pass_criteria.threshold,
          providerBenchmark.primary_score?.metric ?? providerBenchmark.metrics?.[0],
        )
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
      const parameterState = splitBenchmarkParameters(cb.parameters);

      return {
        id: cb.id,
        providerId: pb?.providerId ?? cb.provider_id ?? '',
        name: pb?.name ?? cb.id,
        weight: normalizedWeights[index] ?? 0,
        primaryMetric: primaryScore?.metric,
        lowerIsBetter: primaryScore?.lower_is_better,
        parameters: parameterState.parameters,
        additionalParameters: parameterState.additionalParameters,
        threshold: cb.pass_criteria
          ? getThresholdInputValue(cb.pass_criteria.threshold, primaryScore?.metric)
          : DEFAULT_SUITE_THRESHOLD,
        availableMetrics: pb?.metrics ?? [],
      };
    }),
  );
};

const findSourceBenchmark = (
  sourceBenchmarks: CollectionBenchmark[],
  benchmark: CopySuiteBenchmark,
): CollectionBenchmark | undefined => {
  const matchingBenchmarks = sourceBenchmarks.filter(({ id }) => id === benchmark.id);
  /* eslint-disable camelcase */
  const sourceBenchmark = matchingBenchmarks.find(
    ({ provider_id }) => provider_id === benchmark.providerId,
  );
  /* eslint-enable camelcase */
  return sourceBenchmark ?? (matchingBenchmarks.length === 1 ? matchingBenchmarks[0] : undefined);
};

type BuildEditBenchmarksPatchParams = {
  sourceCollection: Collection;
  initialBenchmarks: CopySuiteBenchmark[];
  currentBenchmarks: CopySuiteBenchmark[];
  requestBenchmarks: CollectionBenchmark[];
};

const buildEditBenchmarksPatch = ({
  sourceCollection,
  initialBenchmarks,
  currentBenchmarks,
  requestBenchmarks,
}: BuildEditBenchmarksPatchParams): CollectionBenchmark[] | undefined => {
  const initialKeys = initialBenchmarks.map(getBenchmarkKey);
  const currentKeys = currentBenchmarks.map(getBenchmarkKey);
  const selectionChanged =
    initialKeys.length !== currentKeys.length ||
    initialKeys.some((key, index) => key !== currentKeys[index]);
  const initialBenchmarksByKey = new Map(
    initialBenchmarks.map((benchmark) => [getBenchmarkKey(benchmark), benchmark]),
  );
  const sourceBenchmarks = sourceCollection.benchmarks ?? [];
  let hasChanges = selectionChanged;

  const patchedBenchmarks = requestBenchmarks.map((requestBenchmark, index) => {
    const currentBenchmark = currentBenchmarks[index];
    const initialBenchmark = initialBenchmarksByKey.get(getBenchmarkKey(currentBenchmark));
    const benchmarkChanged = !initialBenchmark || !isEqual(currentBenchmark, initialBenchmark);
    const sourceBenchmark = findSourceBenchmark(sourceBenchmarks, currentBenchmark);

    hasChanges ||= benchmarkChanged || sourceBenchmark === undefined;

    if (!benchmarkChanged && sourceBenchmark) {
      return sourceBenchmark;
    }

    return sourceBenchmark ? { ...sourceBenchmark, ...requestBenchmark } : requestBenchmark;
  });

  return hasChanges ? patchedBenchmarks : undefined;
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
  mode: 'copy' | 'edit',
): CopySuiteFormValues => ({
  suiteName: mode === 'edit' ? sourceCollection.name : buildDefaultSuiteName(sourceCollection.name),
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

type EditableCollectionRequest = {
  name: string;
  description?: string;
  domains?: string[];
  tasks?: string[];
  modalities?: string[];
  industries?: string[];
  evaluation_targets?: string[];
  pass_criteria?: { threshold: number };
  benchmarks?: CollectionBenchmark[];
};

export const buildCollectionPatchOperations = (
  request: EditableCollectionRequest,
): CollectionPatchOperation[] => {
  const operations: CollectionPatchOperation[] = [
    { op: 'replace', path: '/name', value: request.name },
    { op: 'add', path: '/description', value: request.description ?? '' },
    { op: 'add', path: '/domains', value: request.domains ?? [] },
    { op: 'add', path: '/tasks', value: request.tasks ?? [] },
    { op: 'add', path: '/modalities', value: request.modalities ?? [] },
    { op: 'add', path: '/industries', value: request.industries ?? [] },
    {
      op: 'add',
      // eslint-disable-next-line camelcase
      path: '/evaluation_targets',
      // eslint-disable-next-line camelcase
      value: request.evaluation_targets ?? [],
    },
    {
      op: 'add',
      // eslint-disable-next-line camelcase
      path: '/pass_criteria',
      // eslint-disable-next-line camelcase
      value: request.pass_criteria ?? { threshold: 0 },
    },
  ];

  if (request.benchmarks !== undefined) {
    operations.push({ op: 'add', path: '/benchmarks', value: request.benchmarks });
  }

  return operations;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function useCopySuiteForm({
  namespace,
  sourceCollection,
  providers,
  providersLoaded,
  mode = 'copy',
  onSaveAndRunRequest,
  cancelRoute,
}: UseCopySuiteFormParams) {
  const navigate = useNavigate();
  const notification = useNotification();
  const { refresh: refreshCollections } = useCollectionsContext();
  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';
  const validationSchema = React.useMemo(
    () => getCopySuiteSchema(mode === 'copy' ? sourceCollection?.name : undefined),
    [mode, sourceCollection?.name],
  );

  const form = useForm<CopySuiteFormValues>({
    mode: 'onChange',
    resolver: zodResolver(validationSchema),
    defaultValues: copySuiteDefaultValues,
  });
  const { isValid: isFormValid } = form.formState;

  const initializedRef = React.useRef(false);
  const initialBenchmarksRef = React.useRef<CopySuiteBenchmark[]>([]);
  React.useEffect(() => {
    if (initializedRef.current || !providersLoaded || (!isCreateMode && !sourceCollection)) {
      return;
    }
    initializedRef.current = true;
    const initialValues = sourceCollection
      ? buildInitialFormValues(sourceCollection, providers, isEditMode ? 'edit' : 'copy')
      : copySuiteDefaultValues;
    initialBenchmarksRef.current = initialValues.benchmarks;
    form.reset(initialValues);
    void form.trigger();
  }, [sourceCollection, providers, providersLoaded, form, isCreateMode, isEditMode]);

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
        currentBenchmarks.map((b, i) => {
          if (i !== index) {
            return b;
          }

          const updatedBenchmark = { ...b, [field]: value };
          if (field === 'primaryMetric' && typeof value === 'string' && value !== b.primaryMetric) {
            const providerBenchmark = providers
              .find((provider) => provider.resource.id === b.providerId)
              ?.benchmarks?.find((benchmark) => benchmark.id === b.id);
            updatedBenchmark.threshold = providerBenchmark?.pass_criteria
              ? getThresholdInputValue(providerBenchmark.pass_criteria.threshold, value)
              : isPercentageMetric(value)
                ? DEFAULT_SUITE_THRESHOLD
                : 0;
          }
          return updatedBenchmark;
        }),
        { shouldValidate: true },
      );
    },
    [form, providers],
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

  const isSettingsValid =
    suiteName.trim() !== '' &&
    !isSameAsSourceCollectionName(suiteName, mode === 'copy' ? sourceCollection?.name : undefined);

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
        pass_criteria: { threshold: getThresholdRequestValue(b.threshold, b.primaryMetric) },
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
      evaluation_targets: values.suiteEvaluates,
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

  const buildPatchOperations = React.useCallback(() => {
    const request = buildCloneRequest();
    if (!isEditMode || !sourceCollection) {
      return buildCollectionPatchOperations(request);
    }

    const currentBenchmarks = form.getValues('benchmarks');
    return buildCollectionPatchOperations({
      ...request,
      benchmarks: buildEditBenchmarksPatch({
        sourceCollection,
        initialBenchmarks: initialBenchmarksRef.current,
        currentBenchmarks,
        requestBenchmarks: request.benchmarks,
      }),
    });
  }, [buildCloneRequest, form, isEditMode, sourceCollection]);

  const getPendingCollection = React.useCallback((): Collection | undefined => {
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

      if (isEditMode && (sourceCollection.state?.run_count ?? 0) > 0) {
        notification.error('Failed to update suite', EDIT_AFTER_RUN_ERROR);
        return undefined;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const abortClone = () => controller.abort();
      parentSignal?.addEventListener('abort', abortClone, { once: true });

      try {
        const savedCollection = isEditMode
          ? await patchCollection(
              '',
              namespace,
              sourceCollection.resource.id,
              buildPatchOperations(),
            )({ signal: controller.signal })
          : await cloneCollection(
              '',
              namespace,
              sourceCollection.resource.id,
              buildCloneRequest(),
            )({ signal: controller.signal });

        if (controller.signal.aborted) {
          return undefined;
        }

        refreshCollections();

        fireMiscTrackingEvent(EVAL_HUB_EVENTS.BENCHMARK_RUN_SELECTED, {
          runType: 'collection',
          collectionName: savedCollection.name,
          benchmarkTypes: JSON.stringify((savedCollection.benchmarks ?? []).map((b) => b.id)),
          countOfBenchmarks: savedCollection.benchmarks?.length ?? 0,
        });

        return savedCollection;
      } catch (e) {
        if (!controller.signal.aborted) {
          const message = e instanceof Error ? e.message : 'An unknown error occurred.';
          notification.error(
            isEditMode ? 'Failed to update suite' : 'Failed to copy suite',
            message,
          );
        }
        return undefined;
      } finally {
        parentSignal?.removeEventListener('abort', abortClone);
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [
      sourceCollection,
      namespace,
      form,
      isEditMode,
      buildCloneRequest,
      buildPatchOperations,
      notification,
      refreshCollections,
    ],
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

        refreshCollections();

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
    [isCreateMode, namespace, form, buildCreateRequest, notification, refreshCollections],
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
      if (isEditMode && (sourceCollection?.state?.run_count ?? 0) > 0) {
        notification.error('Failed to update suite', EDIT_AFTER_RUN_ERROR);
        return;
      }

      if (!(await form.trigger())) {
        return;
      }

      controller = new AbortController();
      abortControllerRef.current = controller;
      const savedCollection = isCreateMode
        ? await createCollection('', namespace, buildCreateRequest())({ signal: controller.signal })
        : isEditMode
          ? await patchCollection(
              '',
              namespace,
              sourceCollection!.resource.id,
              buildPatchOperations(),
            )({ signal: controller.signal })
          : await cloneCollection(
              '',
              namespace,
              sourceCollection!.resource.id,
              buildCloneRequest(),
            )({ signal: controller.signal });

      notification.success(
        isCreateMode ? 'Suite created' : isEditMode ? 'Suite updated' : 'Suite saved',
        isEditMode
          ? `"${savedCollection.name}" has been updated.`
          : `"${savedCollection.name}" has been added to your benchmark suites.`,
      );
      refreshCollections();
      navigate(evaluationBenchmarkSuitesRoute(namespace));
    } catch (e) {
      if (controller && !controller.signal.aborted) {
        const message = e instanceof Error ? e.message : 'An unknown error occurred.';
        notification.error(
          isCreateMode
            ? 'Failed to create suite'
            : isEditMode
              ? 'Failed to update suite'
              : 'Failed to copy suite',
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
    isEditMode,
    sourceCollection,
    namespace,
    form,
    buildCreateRequest,
    buildCloneRequest,
    buildPatchOperations,
    navigate,
    notification,
    refreshCollections,
  ]);

  const handleCancel = React.useCallback(() => {
    navigate(cancelRoute ?? evaluationsBaseRoute(namespace));
  }, [cancelRoute, namespace, navigate]);

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
