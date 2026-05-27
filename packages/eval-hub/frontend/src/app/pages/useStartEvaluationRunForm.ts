import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';
import type { MlflowExperiment } from '@odh-dashboard/internal/concepts/mlflow';
import { createEvaluationJob } from '~/app/api/k8s';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import buildEvaluationRequest from '~/app/utils/buildEvaluationRequest';
import getErrorTitle from '~/app/utils/getErrorTitle';
import { evaluationsBaseRoute } from '~/app/routes';
import { useNotification } from '~/app/hooks/useNotification';
import type { Collection, FlatBenchmark } from '~/app/types';

type InputMode = 'inference' | 'prerecorded';
type ExperimentMode = 'existing' | 'new';

const DEFAULT_EXPERIMENT_NAME = 'EvalHub';
const DEFAULT_SUITE_THRESHOLD = 70;

type UseStartEvaluationRunFormParams = {
  namespace: string | undefined;
  benchmark: FlatBenchmark | undefined;
  collection: Collection | undefined;
  isCollectionFlow: boolean;
  experiments: MlflowExperiment[];
  experimentsLoaded: boolean;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function useStartEvaluationRunForm({
  namespace,
  benchmark,
  collection,
  isCollectionFlow,
  experiments,
  experimentsLoaded,
}: UseStartEvaluationRunFormParams) {
  const navigate = useNavigate();
  const notification = useNotification();

  const defaultThreshold = React.useMemo(() => {
    if (collection?.pass_criteria) {
      return Math.round(collection.pass_criteria.threshold * 100);
    }
    if (collection) {
      return DEFAULT_SUITE_THRESHOLD;
    }
    if (benchmark?.pass_criteria) {
      return Math.round(benchmark.pass_criteria.threshold * 100);
    }
    return 0;
  }, [benchmark, collection]);

  const availableMetrics = React.useMemo(() => benchmark?.metrics ?? [], [benchmark]);
  const defaultPrimaryMetric = benchmark?.primary_score?.metric ?? availableMetrics[0];

  const [threshold, setThreshold] = React.useState(defaultThreshold);
  const [thresholdTouched, setThresholdTouched] = React.useState(false);
  const [primaryMetric, setPrimaryMetric] = React.useState<string | undefined>(
    defaultPrimaryMetric,
  );
  const [primaryMetricTouched, setPrimaryMetricTouched] = React.useState(false);

  React.useEffect(() => {
    if (!thresholdTouched) {
      setThreshold(defaultThreshold);
    }
  }, [defaultThreshold, thresholdTouched]);

  React.useEffect(() => {
    if (!primaryMetricTouched) {
      setPrimaryMetric(defaultPrimaryMetric);
    }
  }, [defaultPrimaryMetric, primaryMetricTouched]);

  const handleThresholdChange = React.useCallback((value: number) => {
    setThreshold(value);
    setThresholdTouched(true);
  }, []);

  const handlePrimaryMetricChange = React.useCallback((metric: string) => {
    setPrimaryMetric(metric);
    setPrimaryMetricTouched(true);
  }, []);

  const [evaluationName, setEvaluationName] = React.useState(() =>
    new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
  );

  const [inputMode, setInputMode] = React.useState<InputMode>('inference');
  const [modelName, setModelName] = React.useState('');
  const [endpointUrl, setEndpointUrl] = React.useState('');
  const [apiKeySecretRef, setApiKeySecretRef] = React.useState('');
  const [sourceName, setSourceName] = React.useState('');
  const [datasetUrl, setDatasetUrl] = React.useState('');
  const [accessToken, setAccessToken] = React.useState('');

  const [experimentMode, setExperimentMode] = React.useState<ExperimentMode>('existing');
  const [selectedExperiment, setSelectedExperiment] = React.useState<MlflowExperiment | undefined>(
    undefined,
  );
  const [newExperimentName, setNewExperimentName] = React.useState('');
  const [experimentAutoSelected, setExperimentAutoSelected] = React.useState(false);

  React.useEffect(() => {
    if (!experimentsLoaded || !namespace || experimentAutoSelected) {
      return;
    }
    setExperimentAutoSelected(true);

    if (experiments.length === 0) {
      setExperimentMode('new');
      setNewExperimentName(DEFAULT_EXPERIMENT_NAME);
    } else {
      const defaultExp = experiments.find((e) => e.name === DEFAULT_EXPERIMENT_NAME);
      setExperimentMode('existing');
      setSelectedExperiment(defaultExp ?? experiments[0]);
    }
  }, [experimentsLoaded, experiments, namespace, experimentAutoSelected]);

  const [showAdditionalArgs, setShowAdditionalArgs] = React.useState(false);
  const [additionalArgs, setAdditionalArgs] = React.useState('');
  const [additionalArgsFilename, setAdditionalArgsFilename] = React.useState('');

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const experimentManuallyChangedRef = React.useRef(false);

  React.useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  const benchmarkDisplayName = React.useMemo(() => {
    if (collection) {
      return collection.name;
    }
    if (benchmark) {
      return benchmark.name;
    }
    return '';
  }, [benchmark, collection]);

  const hasBenchmarks =
    !!benchmark || (!!collection && !!collection.benchmarks && collection.benchmarks.length > 0);

  const hasExperiment =
    (experimentMode === 'existing' && !!selectedExperiment) ||
    (experimentMode === 'new' && newExperimentName.trim() !== '');

  const isValid = React.useMemo(() => {
    if (evaluationName.trim() === '' || !hasBenchmarks || !hasExperiment) {
      return false;
    }
    if (inputMode === 'inference') {
      return modelName.trim() !== '' && endpointUrl.trim() !== '';
    }
    return sourceName.trim() !== '' && datasetUrl.trim() !== '';
  }, [
    evaluationName,
    inputMode,
    modelName,
    endpointUrl,
    sourceName,
    datasetUrl,
    hasBenchmarks,
    hasExperiment,
  ]);

  const handleAdditionalArgsFileChange = React.useCallback(
    (
      _event: React.DragEvent<HTMLElement> | React.ChangeEvent<HTMLInputElement> | Event,
      file: File,
    ) => {
      setAdditionalArgsFilename(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : '';
        setAdditionalArgs(text);
      };
      reader.onerror = () => {
        notification.error('File read failed', `Unable to read file "${file.name}".`);
        setAdditionalArgsFilename('');
      };
      reader.readAsText(file);
    },
    [notification],
  );

  const handleAdditionalArgsTextChange = React.useCallback(
    (_event: React.ChangeEvent<HTMLTextAreaElement>, value: string) => {
      setAdditionalArgs(value);
    },
    [],
  );

  const handleAdditionalArgsClear = React.useCallback(() => {
    setAdditionalArgsFilename('');
    setAdditionalArgs('');
  }, []);

  const handleCancel = () => {
    fireFormTrackingEvent(EVAL_HUB_EVENTS.EVALUATION_RUN_STARTED, {
      source: 'evaluations_page',
      evaluationName: evaluationName.trim(),
      sourceType:
        inputMode === 'inference'
          ? ('inference_endpoint' as const)
          : ('pre_recorded_responses' as const),
      hasAPIKey: inputMode === 'inference' ? apiKeySecretRef.trim() !== '' : false,
      hasAdditionalArguments: showAdditionalArgs && additionalArgs.trim() !== '',
      outcome: TrackingOutcome.cancel,
    });
    navigate(evaluationsBaseRoute(namespace));
  };

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    const parsedArgs: Record<string, unknown> = {};
    if (showAdditionalArgs && additionalArgs.trim()) {
      try {
        const parsed: unknown = JSON.parse(additionalArgs);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          notification.error(
            'Invalid benchmark parameters',
            'Benchmark parameters must be a JSON object (e.g. {"key": "value"}).',
          );
          setIsSubmitting(false);
          return;
        }
        Object.assign(parsedArgs, parsed);
      } catch {
        notification.error(
          'Invalid benchmark parameters',
          'Benchmark parameters must be valid JSON.',
        );
        setIsSubmitting(false);
        return;
      }
    }

    const isNewExperiment = experimentMode === 'new';
    const experimentName = isNewExperiment ? newExperimentName.trim() : selectedExperiment?.name;

    const shouldIncludeThreshold = thresholdTouched || defaultThreshold > 0;
    const passCriteriaOverride = shouldIncludeThreshold
      ? { threshold: threshold / 100 }
      : undefined;

    const primaryScoreOverride = primaryMetric
      ? {
          metric: primaryMetric,
          // eslint-disable-next-line camelcase
          lower_is_better: benchmark?.primary_score?.lower_is_better ?? false,
        }
      : undefined;

    const request = buildEvaluationRequest({
      evaluationName,
      inputMode,
      benchmark,
      collection,
      modelName,
      endpointUrl,
      apiKeySecretRef,
      sourceName,
      datasetUrl,
      accessToken,
      additionalArgs: parsedArgs,
      experimentName: experimentName || undefined,
      experimentTags: undefined,
      passCriteriaOverride,
      primaryScoreOverride,
    });

    fireMiscTrackingEvent(EVAL_HUB_EVENTS.MLFLOW_EXPERIMENT_SELECTED, {
      experimentSelection: isNewExperiment
        ? 'new'
        : !experimentManuallyChangedRef.current &&
            selectedExperiment?.name === DEFAULT_EXPERIMENT_NAME
          ? 'default'
          : 'existing',
      experimentName,
    });

    const runTrackingProps = {
      source: 'evaluations_page',
      evaluationName: evaluationName.trim(),
      sourceType:
        inputMode === 'inference'
          ? ('inference_endpoint' as const)
          : ('pre_recorded_responses' as const),
      modelName: inputMode === 'inference' ? modelName.trim() : undefined,
      endpointOrigin: (() => {
        if (inputMode !== 'inference') {
          return undefined;
        }
        try {
          return new URL(endpointUrl.trim()).origin;
        } catch {
          return undefined;
        }
      })(),
      hasAPIKey: inputMode === 'inference' ? apiKeySecretRef.trim() !== '' : false,
      sourceName: inputMode === 'prerecorded' ? sourceName.trim() : undefined,
      hasDatasetURL: inputMode === 'prerecorded' ? datasetUrl.trim() !== '' : false,
      hasAccessToken: inputMode === 'prerecorded' ? accessToken.trim() !== '' : false,
      hasAdditionalArguments: showAdditionalArgs && additionalArgs.trim() !== '',
      countOfAdditionalArguments: Object.keys(parsedArgs).length,
    };

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await createEvaluationJob('', namespace ?? '', request)({ signal: controller.signal });
      fireFormTrackingEvent(EVAL_HUB_EVENTS.EVALUATION_RUN_STARTED, {
        ...runTrackingProps,
        outcome: TrackingOutcome.submit,
        success: true,
      });
      notification.success(
        'Evaluation started',
        `Evaluation "${evaluationName}" has been started.`,
      );
      navigate(evaluationsBaseRoute(namespace));
    } catch (e) {
      if (controller.signal.aborted) {
        return;
      }
      const message = e instanceof Error ? e.message : 'An unknown error occurred.';
      fireFormTrackingEvent(EVAL_HUB_EVENTS.EVALUATION_RUN_STARTED, {
        ...runTrackingProps,
        outcome: TrackingOutcome.submit,
        success: false,
        errorName: e instanceof Error ? e.name : 'UnknownError',
      });
      notification.error(getErrorTitle(e, 'Failed to start evaluation'), message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    evaluationName,
    setEvaluationName,
    inputMode,
    setInputMode,
    modelName,
    setModelName,
    endpointUrl,
    setEndpointUrl,
    apiKeySecretRef,
    setApiKeySecretRef,
    sourceName,
    setSourceName,
    datasetUrl,
    setDatasetUrl,
    accessToken,
    setAccessToken,
    experimentMode,
    setExperimentMode,
    selectedExperiment,
    setSelectedExperiment,
    newExperimentName,
    setNewExperimentName,
    experimentManuallyChangedRef,
    showAdditionalArgs,
    setShowAdditionalArgs,
    additionalArgs,
    additionalArgsFilename,
    handleAdditionalArgsFileChange,
    handleAdditionalArgsTextChange,
    handleAdditionalArgsClear,
    isSubmitting,
    isValid,
    handleSubmit,
    handleCancel,
    benchmarkDisplayName,
    isCollectionFlow,
    threshold,
    handleThresholdChange,
    availableMetrics,
    primaryMetric,
    handlePrimaryMetricChange,
  };
}

export const EXPERIMENT_FILTER = "tags.context = 'eval-hub'";
export { DEFAULT_EXPERIMENT_NAME };
