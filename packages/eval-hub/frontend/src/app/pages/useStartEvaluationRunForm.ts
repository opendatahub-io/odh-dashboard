import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';
import type { MlflowExperiment } from '@odh-dashboard/internal/concepts/mlflow';
import { createEvaluationJob } from '~/app/api/k8s';
import {
  EVAL_HUB_EVENTS,
  type RunSourceSelectedProperties,
  type RunModelSelectedProperties,
  type RunThresholdChangedProperties,
  type RunMetricSelectedProperties,
  type RunParameterChangedProperties,
} from '~/app/tracking/evalhubTrackingConstants';
import buildEvaluationRequest from '~/app/utils/buildEvaluationRequest';
import { getUrlValidationError } from '~/app/utils/validationUtils';
import getErrorTitle from '~/app/utils/getErrorTitle';
import { evaluationsBaseRoute } from '~/app/routes';
import { useNotification } from '~/app/hooks/useNotification';
import { useConnectionValidation } from '~/app/hooks/useConnectionValidation';
import type {
  Collection,
  FlatBenchmark,
  InferenceServiceItem,
  ModelSelection,
  SourceMode,
} from '~/app/types';

type ExperimentMode = 'existing' | 'new';

const DEFAULT_EXPERIMENT_NAME = 'EvalHub';
const DEFAULT_SUITE_THRESHOLD = 70;

export const EXTERNAL_ENDPOINT_VALUE = '__external__';

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

  // ── Threshold & primary metric ──────────────────────────────────────

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

  const benchmarkDisplayNameRef = React.useRef('');
  const defaultPrimaryMetricRef = React.useRef(defaultPrimaryMetric);
  React.useEffect(() => {
    defaultPrimaryMetricRef.current = defaultPrimaryMetric;
  }, [defaultPrimaryMetric]);

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

    const props: RunThresholdChangedProperties = {
      thresholdValue: value,
      benchmarkName: benchmarkDisplayNameRef.current,
    };
    fireMiscTrackingEvent(EVAL_HUB_EVENTS.RUN_THRESHOLD_CHANGED, props);
  }, []);

  const handlePrimaryMetricChange = React.useCallback((metric: string) => {
    setPrimaryMetric(metric);
    setPrimaryMetricTouched(true);

    const props: RunMetricSelectedProperties = {
      metricName: metric,
      isDefault: metric === defaultPrimaryMetricRef.current,
      benchmarkName: benchmarkDisplayNameRef.current,
    };
    fireMiscTrackingEvent(EVAL_HUB_EVENTS.RUN_METRIC_SELECTED, props);
  }, []);

  // ── Evaluation name ─────────────────────────────────────────────────

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

  // ── Source mode (Model / Agent / Pre-recorded) ──────────────────────

  const [sourceMode, setSourceMode] = React.useState<SourceMode>('model');
  const [modelSelection, setModelSelection] = React.useState<ModelSelection>('cluster');
  const [selectedInferenceService, setSelectedInferenceService] = React.useState<
    InferenceServiceItem | undefined
  >(undefined);

  const [modelName, setModelName] = React.useState('');
  const [agentName, setAgentName] = React.useState('');
  const [endpointUrl, setEndpointUrl] = React.useState('');
  const [apiKeySecretRef, setApiKeySecretRef] = React.useState('');
  const [sourceName, setSourceName] = React.useState('');
  const [datasetUrl, setDatasetUrl] = React.useState('');
  const [accessToken, setAccessToken] = React.useState('');

  // ── Connection validation ───────────────────────────────────────────

  const { connectionValidation, setConnectionValidation, handleVerifyConnection } =
    useConnectionValidation({
      namespace,
      sourceMode,
      endpointUrl,
      apiKeySecretRef,
      datasetUrl,
      accessToken,
      modelName,
      agentName,
    });

  const requiresConnectionValidation =
    sourceMode === 'agent' || sourceMode === 'prerecorded' || modelSelection === 'external';

  const handleModelDropdownSelect = React.useCallback(
    (value: string | undefined, inferenceServices: InferenceServiceItem[]) => {
      const isExternal = value === EXTERNAL_ENDPOINT_VALUE;
      if (isExternal) {
        setModelSelection('external');
        setSelectedInferenceService(undefined);
      } else {
        setModelSelection('cluster');
        const is = inferenceServices.find((s) => s.name === value);
        setSelectedInferenceService(is);
      }
      setConnectionValidation({ status: 'idle' });

      if (value) {
        const props: RunModelSelectedProperties = {
          selectedModel: isExternal ? 'Other (External endpoint)' : value,
          isExternal,
        };
        fireMiscTrackingEvent(EVAL_HUB_EVENTS.RUN_MODEL_SELECTED, props);
      }
    },
    [setConnectionValidation],
  );

  const handleSourceModeChange = React.useCallback(
    (mode: SourceMode) => {
      setSourceMode(mode);
      setConnectionValidation({ status: 'idle' });

      const props: RunSourceSelectedProperties = { sourceType: mode };
      fireMiscTrackingEvent(EVAL_HUB_EVENTS.RUN_SOURCE_SELECTED, props);
    },
    [setConnectionValidation],
  );

  // ── Experiment ──────────────────────────────────────────────────────

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

  // ── Additional args ─────────────────────────────────────────────────

  const [showAdditionalArgs, setShowAdditionalArgs] = React.useState(false);
  const [additionalArgs, setAdditionalArgs] = React.useState('');
  const [additionalArgsFilename, setAdditionalArgsFilename] = React.useState('');

  // ── Submission state ────────────────────────────────────────────────

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const experimentManuallyChangedRef = React.useRef(false);

  React.useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  // ── Derived values ──────────────────────────────────────────────────

  const benchmarkDisplayName = React.useMemo(() => {
    if (collection) {
      return collection.name;
    }
    if (benchmark) {
      return benchmark.name;
    }
    return '';
  }, [benchmark, collection]);
  benchmarkDisplayNameRef.current = benchmarkDisplayName;

  const hasBenchmarks =
    !!benchmark || (!!collection && !!collection.benchmarks && collection.benchmarks.length > 0);

  const hasExperiment =
    (experimentMode === 'existing' && !!selectedExperiment) ||
    (experimentMode === 'new' && newExperimentName.trim() !== '');

  // ── Inline field validation ─────────────────────────────────────────

  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const markTouched = React.useCallback((field: string) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }, []);

  const endpointUrlError = React.useMemo((): string | undefined => {
    if (sourceMode === 'prerecorded') {
      return undefined;
    }
    if (sourceMode === 'model' && modelSelection === 'cluster') {
      return undefined;
    }
    return getUrlValidationError(endpointUrl);
  }, [sourceMode, modelSelection, endpointUrl]);

  const datasetUrlError = React.useMemo((): string | undefined => {
    if (sourceMode !== 'prerecorded') {
      return undefined;
    }
    if (datasetUrl.trim() === '') {
      return 'Dataset URL is required.';
    }
    return undefined;
  }, [sourceMode, datasetUrl]);

  // ── Overall form validity ───────────────────────────────────────────

  const isValid = React.useMemo(() => {
    if (evaluationName.trim() === '' || !hasBenchmarks || !hasExperiment) {
      return false;
    }

    if (sourceMode === 'model') {
      if (modelSelection === 'cluster') {
        return !!selectedInferenceService;
      }
      return modelName.trim() !== '' && !endpointUrlError;
    }

    if (sourceMode === 'agent') {
      return agentName.trim() !== '' && !endpointUrlError;
    }

    return sourceName.trim() !== '' && !datasetUrlError;
  }, [
    evaluationName,
    hasBenchmarks,
    hasExperiment,
    sourceMode,
    modelSelection,
    selectedInferenceService,
    modelName,
    agentName,
    endpointUrlError,
    datasetUrlError,
    sourceName,
  ]);

  const canVerifyConnection = React.useMemo(() => {
    if (!requiresConnectionValidation) {
      return false;
    }
    if (connectionValidation.status === 'validating') {
      return false;
    }
    if (sourceMode === 'prerecorded') {
      return !datasetUrlError && datasetUrl.trim() !== '';
    }
    return !endpointUrlError && endpointUrl.trim() !== '';
  }, [
    requiresConnectionValidation,
    connectionValidation.status,
    sourceMode,
    endpointUrlError,
    endpointUrl,
    datasetUrlError,
    datasetUrl,
  ]);

  // ── Additional args handlers ────────────────────────────────────────

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

  // ── Cancel ──────────────────────────────────────────────────────────

  const handleCancel = () => {
    const sourceTypeLabel =
      sourceMode === 'model'
        ? ('model' as const)
        : sourceMode === 'agent'
          ? ('agent' as const)
          : ('pre_recorded_responses' as const);

    fireFormTrackingEvent(EVAL_HUB_EVENTS.EVALUATION_RUN_STARTED, {
      source: 'evaluations_page',
      evaluationName: evaluationName.trim(),
      sourceType: sourceTypeLabel,
      hasAPIKey:
        sourceMode === 'model' || sourceMode === 'agent' ? apiKeySecretRef.trim() !== '' : false,
      hasAdditionalArguments: showAdditionalArgs && additionalArgs.trim() !== '',
      outcome: TrackingOutcome.cancel,
    });
    navigate(evaluationsBaseRoute(namespace));
  };

  // ── Submit ──────────────────────────────────────────────────────────

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

        for (const [key, val] of Object.entries(parsedArgs)) {
          const paramProps: RunParameterChangedProperties = {
            parameterName: key,
            parameterValueShape:
              typeof val === 'string' ? `string(${val.length})` : String(typeof val),
            benchmarkName: benchmarkDisplayName,
            isDefault: false,
          };
          fireMiscTrackingEvent(EVAL_HUB_EVENTS.RUN_PARAMETER_CHANGED, paramProps);
        }
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

    const resolvedModelName = (() => {
      if (sourceMode === 'model') {
        return modelSelection === 'cluster'
          ? (selectedInferenceService?.name ?? '')
          : modelName.trim();
      }
      if (sourceMode === 'agent') {
        return agentName.trim();
      }
      return sourceName.trim();
    })();

    const resolvedEndpointUrl = (() => {
      if (sourceMode === 'model' && modelSelection === 'cluster') {
        return selectedInferenceService?.url ?? '';
      }
      if (sourceMode === 'model' || sourceMode === 'agent') {
        return endpointUrl.trim();
      }
      return '';
    })();

    const resolvedAuth = (() => {
      if (sourceMode === 'model' || sourceMode === 'agent') {
        return apiKeySecretRef.trim();
      }
      return '';
    })();

    const request = buildEvaluationRequest({
      evaluationName,
      sourceMode,
      benchmark,
      collection,
      modelName: resolvedModelName,
      endpointUrl: resolvedEndpointUrl,
      apiKeySecretRef: resolvedAuth,
      sourceName: sourceName.trim(),
      datasetUrl: datasetUrl.trim(),
      accessToken: accessToken.trim(),
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

    const sourceTypeLabel =
      sourceMode === 'model'
        ? ('model' as const)
        : sourceMode === 'agent'
          ? ('agent' as const)
          : ('pre_recorded_responses' as const);

    const runTrackingProps = {
      source: 'evaluations_page',
      evaluationName: evaluationName.trim(),
      sourceType: sourceTypeLabel,
      modelName: sourceMode !== 'prerecorded' ? resolvedModelName : undefined,
      endpointOrigin: (() => {
        if (sourceMode === 'prerecorded') {
          return undefined;
        }
        try {
          return new URL(resolvedEndpointUrl).origin;
        } catch {
          return undefined;
        }
      })(),
      hasAPIKey:
        sourceMode === 'model' || sourceMode === 'agent' ? apiKeySecretRef.trim() !== '' : false,
      sourceName: sourceMode === 'prerecorded' ? sourceName.trim() : undefined,
      hasDatasetURL: sourceMode === 'prerecorded' ? datasetUrl.trim() !== '' : false,
      hasAccessToken: sourceMode === 'prerecorded' ? accessToken.trim() !== '' : false,
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
    sourceMode,
    handleSourceModeChange,
    modelSelection,
    selectedInferenceService,
    handleModelDropdownSelect,
    modelName,
    setModelName,
    agentName,
    setAgentName,
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
    touched,
    markTouched,
    endpointUrlError,
    datasetUrlError,
    connectionValidation,
    handleVerifyConnection,
    canVerifyConnection,
    requiresConnectionValidation,
  };
}

export const EXPERIMENT_FILTER = "tags.context = 'eval-hub'";
export { DEFAULT_EXPERIMENT_NAME };
