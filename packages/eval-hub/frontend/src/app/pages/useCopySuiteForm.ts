import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { normalizeThreshold } from '~/app/utilities/evaluationUtils';
import { weightsToPercentages } from '~/app/utilities/weightDistributionUtils';
import { evaluationCollectionsRoute, evaluationStartRoute } from '~/app/routes';
import { useNotification } from '~/app/hooks/useNotification';
import { cloneCollection } from '~/app/api/k8s';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import type { Collection, CollectionBenchmark, Provider, ProviderBenchmark } from '~/app/types';

const DEFAULT_SUITE_THRESHOLD = 70;
const MIN_WEIGHT_PERCENT = 5;
export const MAX_BENCHMARKS = 10;

export type CopySuiteBenchmark = {
  id: string;
  providerId: string;
  name: string;
  weight: number;
  primaryMetric?: string;
  numSamples?: number;
  datasetSize?: number;
  randomSeed?: number;
  threshold: number;
  availableMetrics: string[];
};

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

type UseCopySuiteFormParams = {
  namespace: string | undefined;
  sourceCollection: Collection | undefined;
  providers: Provider[];
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

  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) {
    return equalWeights(weights.length);
  }

  let normalizedTotal = 0;
  return weights.map((weight, index) => {
    if (index === weights.length - 1) {
      return 1 - normalizedTotal;
    }
    const normalizedWeight = weight / total;
    normalizedTotal += normalizedWeight;
    return normalizedWeight;
  });
};

const buildInitialBenchmarks = (
  collection: Collection,
  providers: Provider[],
): CopySuiteBenchmark[] => {
  const sourceBenchmarks = collection.benchmarks ?? [];
  const normalizedWeights = normalizeWeights(sourceBenchmarks.map((cb) => cb.weight ?? 1));

  return sourceBenchmarks.map((cb, index) => {
    const pb = resolveProviderBenchmark(cb, providers);
    const datasetSize = pb?.dataset_size ?? undefined;
    const initialNumSamples =
      cb.parameters?.limit != null ? Number(cb.parameters.limit) : (datasetSize ?? undefined);

    return {
      id: cb.id,
      providerId: cb.provider_id ?? '',
      name: pb?.name ?? cb.id,
      weight: normalizedWeights[index] ?? 0,
      primaryMetric: cb.primary_score?.metric ?? pb?.primary_score?.metric,
      numSamples: clampNumSamples(initialNumSamples, datasetSize),
      datasetSize,
      randomSeed:
        cb.parameters?.num_fewshot != null
          ? Number(cb.parameters.num_fewshot)
          : (pb?.num_few_shot ?? undefined),
      threshold: cb.pass_criteria
        ? normalizeThreshold(cb.pass_criteria.threshold)
        : DEFAULT_SUITE_THRESHOLD,
      availableMetrics: pb?.metrics ?? [],
    };
  });
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

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function useCopySuiteForm({
  namespace,
  sourceCollection,
  providers,
}: UseCopySuiteFormParams) {
  const navigate = useNavigate();
  const notification = useNotification();

  // ── Suite metadata ───────────────────────────────────────────────────

  const [suiteName, setSuiteName] = React.useState('');
  const [suiteDescription, setSuiteDescription] = React.useState('');
  const [suiteCategory, setSuiteCategory] = React.useState('');
  const [suiteThreshold, setSuiteThreshold] = React.useState(DEFAULT_SUITE_THRESHOLD);

  // ── Benchmarks ───────────────────────────────────────────────────────

  const [benchmarks, setBenchmarks] = React.useState<CopySuiteBenchmark[]>([]);

  // ── Initialization from source collection ────────────────────────────

  const initializedRef = React.useRef(false);
  React.useEffect(() => {
    if (!sourceCollection || initializedRef.current) {
      return;
    }
    initializedRef.current = true;
    setSuiteName(sourceCollection.name);
    setSuiteDescription(sourceCollection.description ?? '');
    setSuiteCategory(sourceCollection.category ?? '');
    setSuiteThreshold(
      sourceCollection.pass_criteria
        ? normalizeThreshold(sourceCollection.pass_criteria.threshold)
        : DEFAULT_SUITE_THRESHOLD,
    );
    setBenchmarks(buildInitialBenchmarks(sourceCollection, providers));
  }, [sourceCollection, providers]);

  // ── Derived values ───────────────────────────────────────────────────

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

  // ── Benchmark mutations ──────────────────────────────────────────────

  const updateBenchmark = React.useCallback(
    (index: number, field: keyof CopySuiteBenchmark, value: unknown) => {
      setBenchmarks((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
    },
    [],
  );

  const removeBenchmark = React.useCallback((index: number) => {
    setBenchmarks((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return rebalanceWeights(prev.filter((_, i) => i !== index));
    });
  }, []);

  const addBenchmarks = React.useCallback((newBenchmarks: CopySuiteBenchmark[]) => {
    setBenchmarks((prev) => rebalanceWeights([...prev, ...newBenchmarks]));
  }, []);

  const handleWeightsChange = React.useCallback((newWeights: number[]) => {
    const normalizedWeights = normalizeWeights(newWeights);
    setBenchmarks((prev) =>
      prev.map((b, i) =>
        i < normalizedWeights.length ? { ...b, weight: normalizedWeights[i] } : b,
      ),
    );
  }, []);

  const handleSuiteThresholdChange = React.useCallback((value: number) => {
    setSuiteThreshold(value);
  }, []);

  // ── Validation ───────────────────────────────────────────────────────

  const isValid = React.useMemo(() => {
    if (suiteName.trim() === '') {
      return false;
    }
    if (benchmarks.length === 0) {
      return false;
    }
    return true;
  }, [suiteName, benchmarks]);

  // ── Submission ───────────────────────────────────────────────────────

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  const buildCloneRequest = React.useCallback(() => {
    /* eslint-disable camelcase */
    const normalizedBenchmarks: CollectionBenchmark[] = benchmarks.map((b) => ({
      id: b.id,
      provider_id: b.providerId || undefined,
      weight: b.weight,
      primary_score: b.primaryMetric
        ? { metric: b.primaryMetric, lower_is_better: false }
        : undefined,
      pass_criteria: { threshold: b.threshold / 100 },
      parameters: {
        ...(b.numSamples != null ? { limit: b.numSamples } : {}),
        ...(b.randomSeed != null ? { num_fewshot: b.randomSeed } : {}),
      },
    }));
    /* eslint-enable camelcase */

    return {
      name: suiteName.trim(),
      description: suiteDescription.trim() || undefined,
      category: suiteCategory || undefined,
      // eslint-disable-next-line camelcase
      pass_criteria: { threshold: suiteThreshold / 100 },
      benchmarks: normalizedBenchmarks,
    };
  }, [suiteName, suiteDescription, suiteCategory, suiteThreshold, benchmarks]);

  const handleSaveAndRun = React.useCallback(async () => {
    if (!isValid || isSubmitting || !sourceCollection || !namespace) {
      return;
    }
    setIsSubmitting(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const clonedCollection = await cloneCollection(
        '',
        namespace,
        sourceCollection.resource.id,
        buildCloneRequest(),
      )({ signal: controller.signal });

      fireMiscTrackingEvent(EVAL_HUB_EVENTS.BENCHMARK_RUN_SELECTED, {
        runType: 'collection',
        collectionName: clonedCollection.name,
        benchmarkTypes: JSON.stringify((clonedCollection.benchmarks ?? []).map((b) => b.id)),
        countOfBenchmarks: clonedCollection.benchmarks?.length ?? 0,
      });

      const params = new URLSearchParams({
        type: 'collection',
        collectionId: clonedCollection.resource.id,
      });
      navigate(`${evaluationStartRoute(namespace)}?${params.toString()}`, {
        state: { collection: clonedCollection },
      });
    } catch (e) {
      if (!controller.signal.aborted) {
        const message = e instanceof Error ? e.message : 'An unknown error occurred.';
        notification.error('Failed to copy suite', message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isValid,
    isSubmitting,
    sourceCollection,
    namespace,
    buildCloneRequest,
    navigate,
    notification,
  ]);

  const handleSaveOnly = React.useCallback(async () => {
    if (!isValid || isSubmitting || !sourceCollection || !namespace) {
      return;
    }
    setIsSubmitting(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const clonedCollection = await cloneCollection(
        '',
        namespace,
        sourceCollection.resource.id,
        buildCloneRequest(),
      )({ signal: controller.signal });

      notification.success(
        'Suite saved',
        `"${clonedCollection.name}" has been added to your benchmark suites.`,
      );
      navigate(evaluationCollectionsRoute(namespace));
    } catch (e) {
      if (!controller.signal.aborted) {
        const message = e instanceof Error ? e.message : 'An unknown error occurred.';
        notification.error('Failed to copy suite', message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isValid,
    isSubmitting,
    sourceCollection,
    namespace,
    buildCloneRequest,
    navigate,
    notification,
  ]);

  const handleCancel = React.useCallback(() => {
    navigate(evaluationCollectionsRoute(namespace));
  }, [navigate, namespace]);

  return {
    suiteName,
    setSuiteName,
    suiteDescription,
    setSuiteDescription,
    suiteCategory,
    setSuiteCategory,
    suiteThreshold,
    handleSuiteThresholdChange,
    benchmarks,
    setBenchmarks,
    totalWeight,
    weightSegments,
    updateBenchmark,
    removeBenchmark,
    addBenchmarks,
    handleWeightsChange,
    isValid,
    isSubmitting,
    handleSaveAndRun,
    handleSaveOnly,
    handleCancel,
    minWeightPercent: MIN_WEIGHT_PERCENT,
  };
}
