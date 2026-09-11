import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
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
import type { ReconfigureFormData } from '~/app/utils/extractReconfigureData';
import { getUrlValidationError } from '~/app/utils/validationUtils';
import getErrorTitle from '~/app/utils/getErrorTitle';
import { normalizeThreshold } from '~/app/utilities/evaluationUtils';
import { evaluationsBaseRoute } from '~/app/routes';
import { useNotification } from '~/app/hooks/useNotification';
import { useConnectionValidation } from '~/app/hooks/useConnectionValidation';
import {
  startEvaluationRunDefaultValues,
  startEvaluationRunSchema,
  type StartEvaluationRunFormValues,
} from '~/app/schemas/startEvaluationRun.schema';
import type { Collection, FlatBenchmark, InferenceServiceItem, SourceMode } from '~/app/types';

type ExperimentMode = StartEvaluationRunFormValues['experimentMode'];

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
  initialValues?: ReconfigureFormData;
  defaultEvaluationName?: string;
  defaultSourceMode?: SourceMode;
  trackingSource?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

const buildDefaultEvaluationName = (
  initialValues: ReconfigureFormData | undefined,
  defaultEvaluationName: string | undefined,
): string => {
  if (initialValues) {
    return initialValues.evaluationName;
  }
  if (defaultEvaluationName?.trim()) {
    return defaultEvaluationName.trim();
  }
  return new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const buildInitialFormValues = ({
  initialValues,
  defaultEvaluationName,
  defaultSourceMode,
  defaultThreshold,
  defaultPrimaryMetric,
}: {
  initialValues?: ReconfigureFormData;
  defaultEvaluationName?: string;
  defaultSourceMode?: SourceMode;
  defaultThreshold: number;
  defaultPrimaryMetric?: string;
}): StartEvaluationRunFormValues => ({
  ...startEvaluationRunDefaultValues,
  evaluationName: buildDefaultEvaluationName(initialValues, defaultEvaluationName),
  sourceMode: initialValues?.sourceMode ?? defaultSourceMode ?? 'model',
  modelSelection: initialValues?.modelSelection ?? 'cluster',
  selectedInferenceServiceName: initialValues?.selectedInferenceService?.name,
  modelName: initialValues?.modelName ?? '',
  agentName: initialValues?.modelName ?? '',
  endpointUrl: initialValues?.endpointUrl ?? '',
  apiKeySecretRef: initialValues?.apiKeySecretRef ?? '',
  sourceName: initialValues?.sourceName ?? '',
  datasetUrl: initialValues?.datasetUrl ?? '',
  accessToken: initialValues?.accessToken ?? '',
  experimentMode: 'existing',
  selectedExperimentName: initialValues?.experimentName,
  newExperimentName: '',
  threshold: initialValues?.threshold ?? defaultThreshold,
  primaryMetric: initialValues?.primaryMetric ?? defaultPrimaryMetric,
  showAdditionalArgs: !!initialValues?.additionalArgs,
  additionalArgs: initialValues?.additionalArgs ?? '',
});

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function useStartEvaluationRunForm({
  namespace,
  benchmark,
  collection,
  isCollectionFlow,
  experiments,
  experimentsLoaded,
  initialValues,
  defaultEvaluationName,
  defaultSourceMode,
  trackingSource = 'evaluations_page',
  onSuccess,
  onCancel,
}: UseStartEvaluationRunFormParams) {
  const navigate = useNavigate();
  const notification = useNotification();
  const isReconfigure = !!initialValues;

  const defaultThreshold = React.useMemo(() => {
    if (collection?.pass_criteria) {
      return normalizeThreshold(collection.pass_criteria.threshold);
    }
    if (collection) {
      return DEFAULT_SUITE_THRESHOLD;
    }
    if (benchmark?.pass_criteria) {
      return normalizeThreshold(benchmark.pass_criteria.threshold);
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

  const form = useForm<StartEvaluationRunFormValues>({
    mode: 'onChange',
    resolver: zodResolver(startEvaluationRunSchema),
    defaultValues: buildInitialFormValues({
      initialValues,
      defaultEvaluationName,
      defaultSourceMode,
      defaultThreshold,
      defaultPrimaryMetric,
    }),
  });

  const [
    evaluationName,
    sourceMode,
    modelSelection,
    selectedInferenceServiceName,
    modelName,
    agentName,
    endpointUrl,
    apiKeySecretRef,
    sourceName,
    datasetUrl,
    accessToken,
    experimentMode,
    selectedExperimentName,
    newExperimentName,
    threshold,
    primaryMetric,
    showAdditionalArgs,
    additionalArgs,
  ] = useWatch({
    control: form.control,
    name: [
      'evaluationName',
      'sourceMode',
      'modelSelection',
      'selectedInferenceServiceName',
      'modelName',
      'agentName',
      'endpointUrl',
      'apiKeySecretRef',
      'sourceName',
      'datasetUrl',
      'accessToken',
      'experimentMode',
      'selectedExperimentName',
      'newExperimentName',
      'threshold',
      'primaryMetric',
      'showAdditionalArgs',
      'additionalArgs',
    ],
  });

  const thresholdTouched = !!form.formState.dirtyFields.threshold || isReconfigure;
  const primaryMetricTouched = !!form.formState.dirtyFields.primaryMetric || isReconfigure;

  React.useEffect(() => {
    if (!thresholdTouched) {
      form.setValue('threshold', defaultThreshold, { shouldValidate: true });
    }
  }, [defaultThreshold, thresholdTouched, form]);

  React.useEffect(() => {
    if (!primaryMetricTouched) {
      form.setValue('primaryMetric', defaultPrimaryMetric, { shouldValidate: true });
    }
  }, [defaultPrimaryMetric, primaryMetricTouched, form]);

  const handleThresholdChange = React.useCallback(
    (value: number) => {
      form.setValue('threshold', value, { shouldDirty: true, shouldValidate: true });

      const props: RunThresholdChangedProperties = {
        thresholdValue: value,
        benchmarkName: benchmarkDisplayNameRef.current,
      };
      fireMiscTrackingEvent(EVAL_HUB_EVENTS.RUN_THRESHOLD_CHANGED, props);
    },
    [form],
  );

  const handlePrimaryMetricChange = React.useCallback(
    (metric: string) => {
      form.setValue('primaryMetric', metric, { shouldDirty: true, shouldValidate: true });

      const props: RunMetricSelectedProperties = {
        metricName: metric,
        isDefault: metric === defaultPrimaryMetricRef.current,
        benchmarkName: benchmarkDisplayNameRef.current,
      };
      fireMiscTrackingEvent(EVAL_HUB_EVENTS.RUN_METRIC_SELECTED, props);
    },
    [form],
  );

  const setEvaluationName = React.useCallback(
    (value: string) => form.setValue('evaluationName', value, { shouldValidate: true }),
    [form],
  );

  const { connectionValidation, setConnectionValidation, handleVerifyConnection } =
    useConnectionValidation({
      namespace,
      sourceMode,
      endpointUrl,
      apiKeySecretRef,
      modelName,
      agentName,
    });

  const requiresConnectionValidation =
    sourceMode === 'agent' || (sourceMode === 'model' && modelSelection === 'external');

  const selectedInferenceServiceRef = React.useRef<InferenceServiceItem | undefined>(
    initialValues?.selectedInferenceService,
  );

  const handleModelDropdownSelect = React.useCallback(
    (value: string | undefined, inferenceServices: InferenceServiceItem[]) => {
      const isExternal = value === EXTERNAL_ENDPOINT_VALUE;
      if (isExternal) {
        form.setValue('modelSelection', 'external', { shouldValidate: true });
        form.setValue('selectedInferenceServiceName', undefined, { shouldValidate: true });
        selectedInferenceServiceRef.current = undefined;
      } else {
        form.setValue('modelSelection', 'cluster', { shouldValidate: true });
        const is = inferenceServices.find((s) => s.name === value);
        form.setValue('selectedInferenceServiceName', is?.name, { shouldValidate: true });
        selectedInferenceServiceRef.current = is;
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
    [form, setConnectionValidation],
  );

  const handleSourceModeChange = React.useCallback(
    (mode: SourceMode) => {
      form.setValue('sourceMode', mode, { shouldValidate: true });
      setConnectionValidation({ status: 'idle' });

      const props: RunSourceSelectedProperties = { sourceType: mode };
      fireMiscTrackingEvent(EVAL_HUB_EVENTS.RUN_SOURCE_SELECTED, props);
    },
    [form, setConnectionValidation],
  );

  const selectedExperiment = React.useMemo(
    () => experiments.find((experiment) => experiment.name === selectedExperimentName),
    [experiments, selectedExperimentName],
  );

  const selectedInferenceService = selectedInferenceServiceRef.current;

  const [experimentAutoSelected, setExperimentAutoSelected] = React.useState(false);
  const experimentManuallyChangedRef = React.useRef(false);

  React.useEffect(() => {
    if (!experimentsLoaded || !namespace || experimentAutoSelected) {
      return;
    }
    setExperimentAutoSelected(true);

    if (experimentManuallyChangedRef.current) {
      return;
    }

    if (initialValues?.experimentName) {
      const match = experiments.find((e) => e.name === initialValues.experimentName);
      if (match) {
        form.setValue('experimentMode', 'existing', { shouldValidate: true });
        form.setValue('selectedExperimentName', match.name, { shouldValidate: true });
      } else {
        form.setValue('experimentMode', 'new', { shouldValidate: true });
        form.setValue('newExperimentName', initialValues.experimentName, { shouldValidate: true });
      }
      return;
    }

    if (experiments.length === 0) {
      form.setValue('experimentMode', 'new', { shouldValidate: true });
      form.setValue('newExperimentName', DEFAULT_EXPERIMENT_NAME, { shouldValidate: true });
    } else {
      const defaultExp = experiments.find((e) => e.name === DEFAULT_EXPERIMENT_NAME);
      form.setValue('experimentMode', 'existing', { shouldValidate: true });
      form.setValue('selectedExperimentName', (defaultExp ?? experiments[0]).name, {
        shouldValidate: true,
      });
    }
  }, [experimentsLoaded, experiments, namespace, experimentAutoSelected, initialValues, form]);

  React.useEffect(() => {
    if (
      !experimentAutoSelected ||
      experimentMode !== 'existing' ||
      selectedExperimentName ||
      !experimentsLoaded ||
      experiments.length === 0
    ) {
      return;
    }
    const defaultExp = experiments.find((e) => e.name === DEFAULT_EXPERIMENT_NAME);
    form.setValue('selectedExperimentName', (defaultExp ?? experiments[0]).name, {
      shouldValidate: true,
    });
  }, [
    experimentAutoSelected,
    experimentMode,
    selectedExperimentName,
    experimentsLoaded,
    experiments,
    form,
  ]);

  const [additionalArgsFilename, setAdditionalArgsFilename] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);

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
  benchmarkDisplayNameRef.current = benchmarkDisplayName;

  const hasBenchmarks =
    !!benchmark || (!!collection && !!collection.benchmarks && collection.benchmarks.length > 0);

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

  const hasExperiment =
    (experimentMode === 'existing' && !!selectedExperimentName?.trim()) ||
    (experimentMode === 'new' && newExperimentName.trim() !== '');

  const isValid = React.useMemo(() => {
    if (evaluationName.trim() === '' || !hasBenchmarks || !hasExperiment) {
      return false;
    }

    if (sourceMode === 'model') {
      if (modelSelection === 'cluster') {
        return !!selectedInferenceServiceName?.trim();
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
    modelName,
    agentName,
    endpointUrlError,
    datasetUrlError,
    sourceName,
    selectedInferenceServiceName,
  ]);

  const canVerifyConnection = React.useMemo(() => {
    if (!requiresConnectionValidation) {
      return false;
    }
    if (connectionValidation.status === 'validating') {
      return false;
    }
    return !endpointUrlError && endpointUrl.trim() !== '';
  }, [requiresConnectionValidation, connectionValidation.status, endpointUrlError, endpointUrl]);

  const setModelName = React.useCallback(
    (value: string) => form.setValue('modelName', value, { shouldValidate: true }),
    [form],
  );
  const setAgentName = React.useCallback(
    (value: string) => form.setValue('agentName', value, { shouldValidate: true }),
    [form],
  );
  const setEndpointUrl = React.useCallback(
    (value: string) => form.setValue('endpointUrl', value, { shouldValidate: true }),
    [form],
  );
  const setApiKeySecretRef = React.useCallback(
    (value: string) => form.setValue('apiKeySecretRef', value, { shouldValidate: true }),
    [form],
  );
  const setSourceName = React.useCallback(
    (value: string) => form.setValue('sourceName', value, { shouldValidate: true }),
    [form],
  );
  const setDatasetUrl = React.useCallback(
    (value: string) => form.setValue('datasetUrl', value, { shouldValidate: true }),
    [form],
  );
  const setAccessToken = React.useCallback(
    (value: string) => form.setValue('accessToken', value, { shouldValidate: true }),
    [form],
  );
  const setExperimentMode = React.useCallback(
    (mode: ExperimentMode) => form.setValue('experimentMode', mode, { shouldValidate: true }),
    [form],
  );
  const setSelectedExperiment = React.useCallback(
    (experiment: MlflowExperiment | undefined) =>
      form.setValue('selectedExperimentName', experiment?.name, { shouldValidate: true }),
    [form],
  );
  const setNewExperimentName = React.useCallback(
    (value: string | ((prev: string) => string)) => {
      const nextValue =
        typeof value === 'function' ? value(form.getValues('newExperimentName')) : value;
      form.setValue('newExperimentName', nextValue, { shouldValidate: true });
    },
    [form],
  );
  const setShowAdditionalArgs = React.useCallback(
    (checked: boolean) => form.setValue('showAdditionalArgs', checked, { shouldValidate: true }),
    [form],
  );

  const handleAdditionalArgsFileChange = React.useCallback(
    (
      _event: React.DragEvent<HTMLElement> | React.ChangeEvent<HTMLInputElement> | Event,
      file: File,
    ) => {
      setAdditionalArgsFilename(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : '';
        form.setValue('additionalArgs', text, { shouldValidate: true });
      };
      reader.onerror = () => {
        notification.error('File read failed', `Unable to read file "${file.name}".`);
        setAdditionalArgsFilename('');
      };
      reader.readAsText(file);
    },
    [form, notification],
  );

  const handleAdditionalArgsTextChange = React.useCallback(
    (_event: React.ChangeEvent<HTMLTextAreaElement>, value: string) => {
      form.setValue('additionalArgs', value, { shouldValidate: true });
    },
    [form],
  );

  const handleAdditionalArgsClear = React.useCallback(() => {
    setAdditionalArgsFilename('');
    form.setValue('additionalArgs', '', { shouldValidate: true });
  }, [form]);

  const handleCancel = React.useCallback(() => {
    abortControllerRef.current?.abort();

    const sourceTypeLabel =
      sourceMode === 'model'
        ? ('model' as const)
        : sourceMode === 'agent'
          ? ('agent' as const)
          : ('pre_recorded_responses' as const);

    fireFormTrackingEvent(EVAL_HUB_EVENTS.EVALUATION_RUN_STARTED, {
      source: trackingSource,
      evaluationName: evaluationName.trim(),
      sourceType: sourceTypeLabel,
      hasAPIKey:
        sourceMode === 'model' || sourceMode === 'agent' ? apiKeySecretRef.trim() !== '' : false,
      hasAdditionalArguments: showAdditionalArgs && additionalArgs.trim() !== '',
      outcome: TrackingOutcome.cancel,
    });
    if (onCancel) {
      onCancel();
      return;
    }
    navigate(evaluationsBaseRoute(namespace));
  }, [
    additionalArgs,
    apiKeySecretRef,
    evaluationName,
    navigate,
    namespace,
    onCancel,
    showAdditionalArgs,
    sourceMode,
    trackingSource,
  ]);

  const handleSubmit = async (submitOverrides?: { collection?: Collection }) => {
    if (!isValid || isSubmitting) {
      return;
    }

    const activeCollection = submitOverrides?.collection ?? collection;
    const values = form.getValues();

    setIsSubmitting(true);

    const parsedArgs: Record<string, unknown> = {};
    if (values.showAdditionalArgs && values.additionalArgs.trim()) {
      try {
        const parsed: unknown = JSON.parse(values.additionalArgs);
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

    const isNewExperiment = values.experimentMode === 'new';
    const experimentName = isNewExperiment
      ? values.newExperimentName.trim()
      : values.selectedExperimentName;

    const shouldIncludeThreshold = thresholdTouched || defaultThreshold > 0;
    const passCriteriaOverride = shouldIncludeThreshold
      ? { threshold: values.threshold / 100 }
      : undefined;

    const primaryScoreOverride = values.primaryMetric
      ? {
          metric: values.primaryMetric,
          // eslint-disable-next-line camelcase
          lower_is_better: benchmark?.primary_score?.lower_is_better ?? false,
        }
      : undefined;

    const resolvedModelName = (() => {
      if (values.sourceMode === 'model') {
        return values.modelSelection === 'cluster'
          ? (values.selectedInferenceServiceName ?? '')
          : values.modelName.trim();
      }
      if (values.sourceMode === 'agent') {
        return values.agentName.trim();
      }
      return values.sourceName.trim();
    })();

    const resolvedEndpointUrl = (() => {
      if (values.sourceMode === 'model' && values.modelSelection === 'cluster') {
        return selectedInferenceServiceRef.current?.url ?? '';
      }
      if (values.sourceMode === 'model' || values.sourceMode === 'agent') {
        return values.endpointUrl.trim();
      }
      return '';
    })();

    const resolvedAuth = (() => {
      if (values.sourceMode === 'model' || values.sourceMode === 'agent') {
        return values.apiKeySecretRef.trim();
      }
      return '';
    })();

    const request = buildEvaluationRequest({
      evaluationName: values.evaluationName,
      sourceMode: values.sourceMode,
      benchmark,
      collection: activeCollection,
      modelName: resolvedModelName,
      endpointUrl: resolvedEndpointUrl,
      apiKeySecretRef: resolvedAuth,
      sourceName: values.sourceName.trim(),
      datasetUrl: values.datasetUrl.trim(),
      accessToken: values.accessToken.trim(),
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
            selectedExperimentName === DEFAULT_EXPERIMENT_NAME
          ? 'default'
          : 'existing',
      experimentName,
    });

    const sourceTypeLabel =
      values.sourceMode === 'model'
        ? ('model' as const)
        : values.sourceMode === 'agent'
          ? ('agent' as const)
          : ('pre_recorded_responses' as const);

    const runTrackingProps = {
      source: trackingSource,
      evaluationName: values.evaluationName.trim(),
      sourceType: sourceTypeLabel,
      modelName: values.sourceMode !== 'prerecorded' ? resolvedModelName : undefined,
      endpointOrigin: (() => {
        if (values.sourceMode === 'prerecorded') {
          return undefined;
        }
        try {
          return new URL(resolvedEndpointUrl).origin;
        } catch {
          return undefined;
        }
      })(),
      hasAPIKey:
        values.sourceMode === 'model' || values.sourceMode === 'agent'
          ? values.apiKeySecretRef.trim() !== ''
          : false,
      sourceName: values.sourceMode === 'prerecorded' ? values.sourceName.trim() : undefined,
      hasDatasetURL: values.sourceMode === 'prerecorded' ? values.datasetUrl.trim() !== '' : false,
      hasAccessToken:
        values.sourceMode === 'prerecorded' ? values.accessToken.trim() !== '' : false,
      hasAdditionalArguments: values.showAdditionalArgs && values.additionalArgs.trim() !== '',
      countOfAdditionalArguments: Object.keys(parsedArgs).length,
    };

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await createEvaluationJob('', namespace ?? '', request)({ signal: controller.signal });
      if (controller.signal.aborted) {
        return;
      }
      fireFormTrackingEvent(EVAL_HUB_EVENTS.EVALUATION_RUN_STARTED, {
        ...runTrackingProps,
        outcome: TrackingOutcome.submit,
        success: true,
      });
      notification.success(
        'Evaluation started',
        `Evaluation "${values.evaluationName}" has been started.`,
      );
      if (onSuccess) {
        onSuccess();
      } else {
        navigate({
          pathname: evaluationsBaseRoute(namespace),
          search: '?tab=runs',
        });
      }
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
    form,
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

export { DEFAULT_EXPERIMENT_NAME };
