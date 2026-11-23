import { useTrackEvent } from '@odh-dashboard/analytics/react';
import {
  isConnectionType,
  isConnectionTypeDataField,
  S3ConnectionTypeKeys,
} from '@odh-dashboard/k8s-core';
import type { Connection } from '@odh-dashboard/k8s-core';
import { useWatchConnectionTypes } from '@odh-dashboard/internal/utilities/useWatchConnectionTypes';
import {
  Alert,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionToggle,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  Divider,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  FormHelperText,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  MenuToggle,
  NumberInput,
  Radio,
  Select,
  SelectList,
  SelectOption,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Tooltip,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  CubesIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
} from '@patternfly/react-icons';
import { findKey } from 'es-toolkit';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Navigate, useParams } from 'react-router';
import S3FileExplorer from '@odh-dashboard/internal/concepts/fileExplorer/S3FileExplorer/S3FileExplorer';
import type { ExplorerFile } from '@odh-dashboard/internal/concepts/fileExplorer/types';
import { ConfigureFormGroup } from '@odh-dashboard/autox-core/ui/components/primitive';
import {
  ConnectionModal,
  SecretSelector,
  type SecretSelection,
} from '@odh-dashboard/autox-core/ui/components/feature';
import { getMissingRequiredKeys } from '@odh-dashboard/autox-core/ui/utils';
import { getInferredPredictionType } from '~/app/utilities/predictionTypeUtils';
import useDatasetUpload from '~/app/hooks/useDatasetUpload';
import useReconfigureSafeEffect from '~/app/hooks/useReconfigureSafeEffect';
import { useS3GetFileSchemaQuery } from '~/app/hooks/useS3GetFileSchemaQuery';
import { useS3GetFileRowCountQuery } from '~/app/hooks/useS3GetFileRowCountQuery';
import { useNotification } from '~/app/hooks/useNotification';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import { SecretListItem } from '~/app/types';
import {
  DEFAULT_EVAL_METRIC_BY_TASK,
  MAX_TOP_N_TABULAR,
  MAX_TOP_N_TIMESERIES,
  MIN_TOP_N,
  PRESET_BETTER_QUALITY,
  PRESET_FASTER,
  PRESET_LABELS,
  PRESETS,
  REQUIRED_CONNECTION_SECRET_KEYS,
  TASK_TYPE_TIMESERIES,
  TASK_TYPES,
  TIMESERIES_PRESETS,
} from '~/app/utilities/const';
import {
  findTimestampColumn,
  formatFilteredNonASCIIColumnsMessage,
  getTypeAcronym,
  isASCIIOnly,
} from '~/app/utilities/columnUtils';
import { automlExperimentsPathname } from '~/app/utilities/routes';
import { DATASET_SPLIT_AUTO, DATASET_SPLIT_SEPARATE } from '~/app/utilities/datasetSplit';
import { findEquivalentMetric, formatMetricName } from '~/app/utilities/utils';
import {
  fireAutomlS3ConnectionCreated,
  fireAutomlTargetColumnConfigured,
  fireAutomlTrainingDataConfigured,
  TrackingOutcome,
  type AutomlFunnelStep,
} from '~/app/utilities/tracking';
import LoadingFormField from './LoadingFormField';
import AutomlPredictionTypeHelperText from './AutomlPredictionTypeHelperText';
import AutomlPredictionTypeSelector from './AutomlPredictionTypeSelector';
import ConfigureTimeseriesForm from './ConfigureTimeseriesForm';
import OptimizationMetricModal from './OptimizationMetricModal';
import DatasetCompatibilityCheck from './DatasetCompatibilityCheck';
import DatasetFileDetailsPreview from './DatasetFileDetailsPreview';
import DatasetFilePreview from './DatasetFilePreview';
import DatasetSamplingError from './DatasetSamplingError';
import DatasetFilePicker, { type DatasetFileSourceMode } from './DatasetFilePicker';
import '@patternfly/react-styles/css/utilities/Text/text.css';
import './AutomlConfigure.scss';

const SYSTEM_FOLDER_DISABLED_REASON = 'This is a system folder and cannot be selected.';
const SHARED_DATA_CONNECTION_DESCRIPTION =
  'Training and test data use the same S3 connection and bucket. Changing the connection clears both file selections.';

function focusDatasetToggleBeforeCollapse(dataset: 'training' | 'test'): void {
  const panel = document.getElementById(`${dataset}-data-accordion-content`);
  if (panel?.contains(document.activeElement)) {
    document.getElementById(`${dataset}-data-accordion-toggle`)?.focus();
  }
}

function explorerFileFromKey(fileKey?: string): ExplorerFile | undefined {
  if (!fileKey) {
    return undefined;
  }
  const lastSegment = fileKey.split('/').pop();
  const fileName = lastSegment || fileKey;
  const extension = fileName.includes('.') ? (fileName.split('.').pop() ?? '') : '';
  return { name: fileName, path: `/${fileKey}`, type: extension };
}

type AutomlConfigureProps = {
  initialInputDataSecret?: SecretSelection;
  onDatasetUploadChange?: (isUploading: boolean) => void;
  /** Reports whether the currently selected prediction type matches the recommendation derived from the target column. */
  onRecommendationChange?: (isRecommended: boolean) => void;
  /** Reports the furthest configure-step section the user has reached, for funnel exit tracking. */
  onFunnelStepChange?: (step: AutomlFunnelStep) => void;
};

function AutomlConfigure({
  initialInputDataSecret,
  onDatasetUploadChange,
  onRecommendationChange,
  onFunnelStepChange,
}: AutomlConfigureProps): React.JSX.Element {
  const trackEvent = useTrackEvent();
  const form = useFormContext<ConfigureSchema>();
  const {
    control,
    setValue,
    getValues,
    trigger,
    formState: { isSubmitting: formIsSubmitting, errors },
  } = form;
  const { namespace } = useParams();
  const [allConnectionTypes] = useWatchConnectionTypes();
  const automlConnectionTypes = React.useMemo(
    () =>
      allConnectionTypes.filter((ct) => {
        if (!isConnectionType(ct)) {
          return false;
        }
        const fieldEnvs = ct.data?.fields?.map((f) => isConnectionTypeDataField(f) && f.envVar);
        return S3ConnectionTypeKeys.every((envVar) => fieldEnvs?.includes(envVar));
      }),
    [allConnectionTypes],
  );
  const [isTargetColumnOpen, setIsTargetColumnOpen] = useState(false);
  const [isMetricModalOpen, setIsMetricModalOpen] = useState(false);
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [newConnectionNotLoaded, setNewConnectionNotLoaded] = useState(false);
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState<boolean>(false);
  const [filePreview, setFilePreview] = useState<{ fileKey: string; scope: string }>();
  const [fileExplorerTarget, setFileExplorerTarget] = useState<'train' | 'test'>('train');
  const [isTrainingAccordionExpanded, setIsTrainingAccordionExpanded] = useState(false);
  const [isTestAccordionExpanded, setIsTestAccordionExpanded] = useState(false);
  const [focusedDataset, setFocusedDataset] = useState<'training' | 'test'>();
  const initialFileKey = getValues('train_data_file_key');
  const initialTestFileKey = getValues('test_data_file_key');

  const [selectedSecret, setSelectedSecret] = useState<SecretSelection | undefined>(
    initialInputDataSecret?.name === getValues('train_data_secret_name')
      ? initialInputDataSecret
      : undefined,
  );
  const [trainingDataSourceMode, setTrainingDataSourceMode] =
    useState<DatasetFileSourceMode>('select');
  const [testDataSourceMode, setTestDataSourceMode] = useState<DatasetFileSourceMode>('select');
  const [selectedTrainingDataFile, setSelectedTrainingDataFile] = useState<
    ExplorerFile | undefined
  >(() => explorerFileFromKey(initialFileKey));
  const [isTrainingDataFileUploading, setIsTrainingDataFileUploading] = useState(false);
  const [isTrainingDataUploadDropdownOpen, setIsTrainingDataUploadDropdownOpen] = useState(false);
  const trainingDataUploadSeqRef = useRef(0);
  const pendingTrainingDataCollapseRef = useRef<string>();
  const trainingDataNativeInputRef = useRef<HTMLInputElement>(null);
  const [selectedTestDataFile, setSelectedTestDataFile] = useState<ExplorerFile | undefined>(() =>
    explorerFileFromKey(initialTestFileKey),
  );
  const [isTestDataFileUploading, setIsTestDataFileUploading] = useState(false);
  const [isTestDataUploadDropdownOpen, setIsTestDataUploadDropdownOpen] = useState(false);
  const testDataUploadSeqRef = useRef(0);
  const pendingTestDataCollapseRef = useRef<string>();
  const testDataNativeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onDatasetUploadChange?.(isTrainingDataFileUploading || isTestDataFileUploading);
  }, [isTrainingDataFileUploading, isTestDataFileUploading, onDatasetUploadChange]);

  useEffect(() => () => onDatasetUploadChange?.(false), [onDatasetUploadChange]);

  useEffect(
    () => () => {
      trainingDataUploadSeqRef.current += 1;
      testDataUploadSeqRef.current += 1;
    },
    [],
  );
  const secretsRefreshRef = useRef<(() => Promise<SecretListItem[] | undefined>) | null>(null);
  // Initialized from initialFileKey so the file-change effect treats the pre-populated
  // value as the baseline in reconfigure and Back → Next flows, preventing an unnecessary reset on mount.
  const previousFileKeyRef = useRef<string | undefined>(initialFileKey);

  const notification = useNotification();

  const [
    trainDataSecretName,
    trainDataBucketName,
    trainDataFileKey,
    taskType,
    targetColumn,
    timestampColumn,
    idColumn,
    knownCovariatesNames,
    evalMetric,
    datasetSplitMode,
    testDataFileKey,
  ] = useWatch({
    control: form.control,
    name: [
      'train_data_secret_name',
      'train_data_bucket_name',
      'train_data_file_key',
      'task_type',
      'target_column',
      'timestamp_column',
      'id_column',
      'known_covariates_names',
      'eval_metric',
      'dataset_split_mode',
      'test_data_file_key',
    ],
  });
  const isTargetColumnSelected = Boolean(targetColumn?.trim());
  const isTaskTypeSelected = TASK_TYPES.includes(taskType);
  const isTimeseries = taskType === TASK_TYPE_TIMESERIES;

  // Calculate max top_n based on task type
  const maxTopN = isTimeseries ? MAX_TOP_N_TIMESERIES : MAX_TOP_N_TABULAR;
  const availablePresets = isTimeseries ? TIMESERIES_PRESETS : PRESETS;

  // Clear timeseries fields that conflict with the selected target column
  useEffect(() => {
    if (!targetColumn) {
      return;
    }
    const clearedFields: string[] = [];
    if (timestampColumn === targetColumn) {
      setValue('timestamp_column', '', { shouldValidate: true });
      clearedFields.push('timestamp column');
    }
    if (idColumn === targetColumn) {
      setValue('id_column', '', { shouldValidate: true });
      clearedFields.push('ID column');
    }
    if (knownCovariatesNames?.includes(targetColumn)) {
      setValue(
        'known_covariates_names',
        knownCovariatesNames.filter((name) => name !== targetColumn),
        { shouldValidate: true },
      );
      clearedFields.push('known covariates');
    }
    if (clearedFields.length > 0 && isTaskTypeSelected && isTimeseries) {
      notification.warning(
        'Timeseries fields updated',
        `"${targetColumn}" was removed from ${clearedFields.join(
          ', ',
        )} because it is now the target column.`,
      );
    }
  }, [
    targetColumn,
    timestampColumn,
    idColumn,
    knownCovariatesNames,
    setValue,
    isTaskTypeSelected,
    isTimeseries,
    notification,
  ]);

  // Cast eval_metric to the new task type's key format, or reset to the default if unsupported
  useReconfigureSafeEffect(() => {
    if (isTaskTypeSelected) {
      const current = getValues('eval_metric');
      const equivalent = findEquivalentMetric(current, taskType);
      setValue('eval_metric', equivalent ?? DEFAULT_EVAL_METRIC_BY_TASK[taskType], {
        shouldValidate: true,
      });
      void trigger('top_n');
    }
  }, [taskType, isTaskTypeSelected, getValues, setValue, trigger]);

  const canSelectFiles = !selectedSecret?.invalid && Boolean(trainDataSecretName);
  const isFileSelected = Boolean(trainDataFileKey);
  const areDocumentsComplete =
    isFileSelected &&
    (datasetSplitMode !== DATASET_SPLIT_SEPARATE || Boolean(testDataFileKey?.trim()));
  const areDatasetFilesDistinct = trainDataFileKey !== testDataFileKey;
  const hasIdenticalDatasetFiles = !areDatasetFilesDistinct && isFileSelected;
  const testDataFileError = hasIdenticalDatasetFiles
    ? 'Test data must use a different file from training data'
    : errors.test_data_file_key?.message;
  const selectedDatasetCount =
    Number(Boolean(trainDataFileKey.trim())) + Number(Boolean(testDataFileKey?.trim()));

  const canSelectLearningType = isFileSelected;
  // && Boolean(watch('train_data_bucket_name')); // Add condition when we have bucket selection

  const {
    data: schemaColumns = [],
    isLoading: isLoadingColumns,
    isFetching: isFetchingColumns,
    error: columnsError,
    resetSchemaCache,
    sample: trainingSample,
    refetch: refetchTrainingSample,
  } = useS3GetFileSchemaQuery(
    namespace ?? '',
    trainDataSecretName,
    trainDataBucketName,
    trainDataFileKey,
  );

  const testSampleQuery = useS3GetFileSchemaQuery(
    namespace ?? '',
    trainDataSecretName,
    trainDataBucketName,
    datasetSplitMode === DATASET_SPLIT_SEPARATE ? testDataFileKey : undefined,
  );

  useEffect(() => {
    if (datasetSplitMode === DATASET_SPLIT_SEPARATE) {
      void trigger('test_data_file_key');
    }
  }, [trainDataFileKey, datasetSplitMode, trigger]);

  // Collapse after a new file loads, while preserving manual reopening across refetches.
  useEffect(() => {
    if (!trainDataFileKey || datasetSplitMode !== DATASET_SPLIT_SEPARATE) {
      pendingTrainingDataCollapseRef.current = undefined;
    } else if (
      areDatasetFilesDistinct &&
      pendingTrainingDataCollapseRef.current === trainDataFileKey &&
      !isTrainingDataFileUploading &&
      !isLoadingColumns &&
      !isFetchingColumns &&
      !columnsError &&
      schemaColumns.length > 0
    ) {
      pendingTrainingDataCollapseRef.current = undefined;
      focusDatasetToggleBeforeCollapse('training');
      setIsTrainingAccordionExpanded(false);
    }
  }, [
    datasetSplitMode,
    trainDataFileKey,
    areDatasetFilesDistinct,
    isTrainingDataFileUploading,
    isLoadingColumns,
    isFetchingColumns,
    columnsError,
    schemaColumns.length,
  ]);

  useEffect(() => {
    if (!testDataFileKey || datasetSplitMode !== DATASET_SPLIT_SEPARATE) {
      pendingTestDataCollapseRef.current = undefined;
    } else if (
      areDatasetFilesDistinct &&
      pendingTestDataCollapseRef.current === testDataFileKey &&
      !isTestDataFileUploading &&
      !testSampleQuery.isFetching &&
      !testSampleQuery.error &&
      testSampleQuery.data.length > 0
    ) {
      pendingTestDataCollapseRef.current = undefined;
      focusDatasetToggleBeforeCollapse('test');
      setIsTestAccordionExpanded(false);
    }
  }, [
    datasetSplitMode,
    testDataFileKey,
    areDatasetFilesDistinct,
    isTestDataFileUploading,
    testSampleQuery.isFetching,
    testSampleQuery.error,
    testSampleQuery.data.length,
  ]);

  const previewScope = `${namespace}/${trainDataSecretName}/${trainDataBucketName}`;
  const previewFileKey = filePreview?.scope === previewScope ? filePreview.fileKey : undefined;
  const setPreviewFileKey = (fileKey?: string) =>
    setFilePreview(fileKey ? { fileKey, scope: previewScope } : undefined);

  const {
    data: trainingDataRowCount,
    isFetching: isFetchingRowCount,
    error: rowCountError,
  } = useS3GetFileRowCountQuery(
    namespace ?? '',
    trainDataSecretName,
    trainDataBucketName,
    trainDataFileKey,
    datasetSplitMode !== DATASET_SPLIT_SEPARATE,
  );

  // KFP MySQL rejects non-ASCII column names in PipelineRuntimeManifest — hide them from picks.
  const columns = React.useMemo(
    () => schemaColumns.filter((column) => isASCIIOnly(column.name)),
    [schemaColumns],
  );
  const filteredNonASCIIColumnCount = schemaColumns.length - columns.length;

  // Synchronize dataset metadata with the form resolver, including after file changes.
  useEffect(() => {
    setValue('training_data_column_count', schemaColumns.length, { shouldValidate: true });
    if (schemaColumns.length === 2) {
      setValue('id_column', '', { shouldValidate: true });
    }
  }, [schemaColumns.length, setValue]);

  const selectedColumn = columns.find((c) => c.name === targetColumn);

  useEffect(() => {
    if (columnsError && datasetSplitMode !== DATASET_SPLIT_SEPARATE) {
      notification.warning('Column schema error', columnsError.message);
    }
  }, [columnsError, datasetSplitMode, notification]);

  // Report whether the selected prediction type matches the target column's recommended type
  useEffect(() => {
    const inferred = getInferredPredictionType(selectedColumn, columns);
    onRecommendationChange?.(!inferred || taskType === inferred);
  }, [selectedColumn, columns, taskType, onRecommendationChange]);

  // Funnel milestone tracking — fires once per configure-step visit, the first time each
  // section is completed via an actual user selection, to measure retention through the
  // multi-section configure flow. These refs always start false (even in reconfigure flows
  // where the value is pre-populated): the milestones and funnel-step progress below are
  // fired directly from the training-data and target-column *selection handlers*, not from
  // effects watching the resulting form value. A generic effect can't tell a pre-populated
  // reconfigure value apart from a real selection, and doesn't reset when the value is later
  // cleared (e.g. by the file-change reset effect) — so replacing a pre-populated value would
  // silently never fire again. Firing from the handlers sidesteps both problems, since those
  // handlers only ever run in response to a user action.
  const hasFiredTrainingDataMilestoneRef = useRef(false);
  const hasFiredTargetColumnMilestoneRef = useRef(false);

  const fireTrainingDataMilestoneOnce = useCallback(
    (mode: 'select' | 'upload') => {
      if (!hasFiredTrainingDataMilestoneRef.current) {
        hasFiredTrainingDataMilestoneRef.current = true;
        fireAutomlTrainingDataConfigured(trackEvent, mode);
      }
    },
    [trackEvent],
  );

  // Sync bucket from the resolved secret object (skips mount to preserve pre-populated values in reconfigure)
  useReconfigureSafeEffect(() => {
    // Clear bucket when the secret object is deselected
    if (!selectedSecret || !selectedSecret.data) {
      setValue('train_data_bucket_name', '', { shouldValidate: true });
      return;
    }

    const bucketKey = findKey(selectedSecret.data, (value, key) => key === 'AWS_S3_BUCKET');
    setValue('train_data_bucket_name', bucketKey ? selectedSecret.data[bucketKey] : '', {
      shouldValidate: true,
    });
  }, [selectedSecret, setValue]);

  // reset selected file values if namespace, secret or bucket changes (skips mount to preserve reconfigure)
  useReconfigureSafeEffect(() => {
    trainingDataUploadSeqRef.current += 1;
    testDataUploadSeqRef.current += 1;
    setIsTrainingDataFileUploading(false);
    setIsTestDataFileUploading(false);
    setValue('train_data_file_key', '', { shouldValidate: true });
    setSelectedTrainingDataFile(undefined);
    setValue('test_data_file_key', '', { shouldValidate: true });
    setValue('test_data_bucket_name', '', { shouldValidate: true });
    setSelectedTestDataFile(undefined);
  }, [namespace, trainDataSecretName, trainDataBucketName, setValue]);

  // reset training data key when select vs upload mode changes (skips mount to preserve reconfigure)
  useReconfigureSafeEffect(() => {
    trainingDataUploadSeqRef.current += 1;
    setIsTrainingDataFileUploading(false);
    setValue('train_data_file_key', '', { shouldValidate: true });
    setSelectedTrainingDataFile(undefined);
  }, [trainingDataSourceMode, setValue]);

  useReconfigureSafeEffect(() => {
    testDataUploadSeqRef.current += 1;
    setIsTestDataFileUploading(false);
    setValue('test_data_file_key', '', { shouldValidate: true });
    setSelectedTestDataFile(undefined);
  }, [testDataSourceMode, setValue]);

  // reset prediction type and column-related form fields when file selection changes
  useEffect(() => {
    const fileChangedOrRemoved =
      (trainDataFileKey && trainDataFileKey !== previousFileKeyRef.current) ||
      (!trainDataFileKey && previousFileKeyRef.current);
    if (fileChangedOrRemoved) {
      // Reset task type form fields
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- intentionally invalid value to clear selection
      setValue('task_type', '' as never, { shouldValidate: true });

      // Reset target column
      setValue('target_column', '', { shouldValidate: true });

      // Reset timeseries form fields
      setValue('timestamp_column', '', { shouldValidate: true });
      setValue('id_column', '', { shouldValidate: true });
      setValue('known_covariates_names', [], { shouldValidate: true });
      setValue('prediction_length', undefined, { shouldValidate: true });
    }
    previousFileKeyRef.current = trainDataFileKey;
  }, [trainDataFileKey, setValue]);

  // reset columns query cache and target column when connection data is cleared
  useEffect(() => {
    if (!namespace) {
      return;
    }
    if (!trainDataSecretName || !trainDataBucketName || !trainDataFileKey) {
      resetSchemaCache();
      setValue('target_column', '', { shouldValidate: true });
    }
  }, [
    trainDataSecretName,
    trainDataBucketName,
    trainDataFileKey,
    namespace,
    resetSchemaCache,
    setValue,
  ]);

  // Auto-detect and set timestamp_column when columns are loaded, only if not already set
  useEffect(() => {
    if (columns.length === 0) {
      return;
    }
    const current = getValues('timestamp_column');
    if (!current) {
      const detectedTimestamp = findTimestampColumn(columns);
      if (detectedTimestamp) {
        setValue('timestamp_column', detectedTimestamp, { shouldValidate: true });
      }
    }
  }, [columns, setValue, getValues]);

  // Initialize timeseries-specific fields when switching to timeseries mode
  useEffect(() => {
    if (taskType === TASK_TYPE_TIMESERIES) {
      // Only set default values if the fields are undefined
      if (getValues('prediction_length') === undefined) {
        setValue('prediction_length', 1, { shouldValidate: true });
      }
      if (getValues('known_covariates_names') === undefined) {
        setValue('known_covariates_names', [], { shouldValidate: true });
      }
    }
  }, [taskType, getValues, setValue]);

  const clearTrainingDataUpload = useCallback(() => {
    setIsTrainingDataFileUploading(false);
    setIsTrainingDataUploadDropdownOpen(false);
    setValue('train_data_file_key', '', { shouldValidate: true });
  }, [setValue]);

  const startTrainingDataUpload = useCallback(() => {
    pendingTrainingDataCollapseRef.current = undefined;
    setValue('train_data_file_key', '', { shouldValidate: true });
    setIsTrainingDataUploadDropdownOpen(false);
  }, [setValue]);

  const completeTrainingDataUpload = useCallback(
    (key: string) => {
      pendingTrainingDataCollapseRef.current = key;
      setValue('train_data_file_key', key, { shouldValidate: true });
      fireTrainingDataMilestoneOnce('upload');
    },
    [setValue, fireTrainingDataMilestoneOnce],
  );

  const { uploadFile: uploadTrainingDataFile, processDrop: processTrainingDataDropOutcome } =
    useDatasetUpload({
      namespace,
      secretName: trainDataSecretName,
      bucket: trainDataBucketName,
      requestSequenceRef: trainingDataUploadSeqRef,
      onStart: startTrainingDataUpload,
      onSuccess: completeTrainingDataUpload,
      onUploadingChange: setIsTrainingDataFileUploading,
    });

  const openTrainingDataReplaceFileDialog = useCallback(() => {
    setIsTrainingDataUploadDropdownOpen(false);
    trainingDataNativeInputRef.current?.click();
  }, []);

  const clearTestDataUpload = useCallback(() => {
    testDataUploadSeqRef.current += 1;
    setIsTestDataFileUploading(false);
    setIsTestDataUploadDropdownOpen(false);
    setValue('test_data_file_key', '', { shouldValidate: true });
    setSelectedTestDataFile(undefined);
  }, [setValue]);

  const startTestDataUpload = useCallback(() => {
    pendingTestDataCollapseRef.current = undefined;
    setIsTestDataUploadDropdownOpen(false);
  }, []);

  const completeTestDataUpload = useCallback(
    (key: string) => {
      pendingTestDataCollapseRef.current = key;
      setValue('test_data_file_key', key, { shouldValidate: true });
      setSelectedTestDataFile(explorerFileFromKey(key));
    },
    [setValue],
  );

  const { uploadFile: uploadTestDataFile, processDrop: processTestDataDropOutcome } =
    useDatasetUpload({
      namespace,
      secretName: trainDataSecretName,
      bucket: trainDataBucketName,
      requestSequenceRef: testDataUploadSeqRef,
      onStart: startTestDataUpload,
      onSuccess: completeTestDataUpload,
      onUploadingChange: setIsTestDataFileUploading,
    });

  const openTestDataReplaceFileDialog = useCallback(() => {
    setIsTestDataUploadDropdownOpen(false);
    testDataNativeInputRef.current?.click();
  }, []);

  const applyDatasetSplitMode = (
    mode: typeof DATASET_SPLIT_AUTO | typeof DATASET_SPLIT_SEPARATE,
  ) => {
    setValue('dataset_split_mode', mode, { shouldValidate: true });
    if (mode === DATASET_SPLIT_AUTO) {
      testDataUploadSeqRef.current += 1;
      setIsTestDataFileUploading(false);
      setValue('test_data_file_key', '', { shouldValidate: true });
      setValue('test_data_bucket_name', '', { shouldValidate: true });
      setSelectedTestDataFile(undefined);
    }
  };

  const renderConnectionSelector = (
    description: string,
    dataTestId = 'aws-secret-selector',
  ): React.JSX.Element => (
    <StackItem>
      <ConfigureFormGroup label="1. Choose a connection" description={description}>
        <Flex
          flexWrap={{ default: 'wrap' }}
          alignItems={{ default: 'alignItemsCenter' }}
          spaceItems={{ default: 'spaceItemsMd' }}
        >
          <FlexItem flex={{ default: 'flex_1' }} className="automl-configure__connection-selector">
            <Controller
              control={control}
              name="train_data_secret_name"
              render={({ field: { onChange } }) => (
                <SecretSelector
                  namespace={String(namespace)}
                  type="storage"
                  additionalRequiredKeys={REQUIRED_CONNECTION_SECRET_KEYS}
                  isDisabled={formIsSubmitting}
                  value={selectedSecret?.uuid}
                  valueName={trainDataSecretName}
                  onChange={(secret) => {
                    if (!secret) {
                      setSelectedSecret(undefined);
                      onChange('');
                      return;
                    }

                    const requiredKeys = REQUIRED_CONNECTION_SECRET_KEYS[secret.type ?? ''];
                    const invalid = requiredKeys
                      ? getMissingRequiredKeys(requiredKeys, Object.keys(secret.data ?? {}))
                          .length > 0
                      : true;
                    setNewConnectionNotLoaded(false);
                    setSelectedSecret({ ...secret, invalid });
                    onChange(invalid ? '' : secret.name);
                  }}
                  onRefreshReady={(refresh) => {
                    secretsRefreshRef.current = refresh;
                  }}
                  placeholder="Select connection"
                  toggleWidth="100%"
                  dataTestId={dataTestId}
                />
              )}
            />
          </FlexItem>
          <FlexItem>
            <Button
              key={`add-new-connection-${dataTestId}`}
              variant="secondary"
              isDisabled={formIsSubmitting}
              onClick={() => setIsConnectionModalOpen(true)}
            >
              Add new connection
            </Button>
          </FlexItem>
        </Flex>
      </ConfigureFormGroup>
    </StackItem>
  );

  if (!namespace) {
    return <Navigate to={automlExperimentsPathname} replace />;
  }

  return (
    <>
      <Grid className="pf-v6-u-h-100" hasGutter>
        <GridItem span={12} lg={5} xl2={4}>
          <Card className="pf-v6-u-p-xs" isFullHeight>
            <div style={{ overflow: 'auto' }}>
              <CardBody>
                <Stack hasGutter>
                  <StackItem>
                    <ConfigureFormGroup
                      label="Data splitting"
                      description="Choose how to divide your data for training and testing."
                      labelHelp={{
                        header: 'Data splitting',
                        body: (
                          <Content>
                            {datasetSplitMode === DATASET_SPLIT_SEPARATE ? (
                              <Content component="p">
                                The system uses your supplied training and test files instead of
                                splitting a single file.
                              </Content>
                            ) : (
                              <>
                                <Content component="p">
                                  The system uses 80% of your data to train the model and 20% to
                                  test how well it learned.
                                </Content>
                                <Content component="p">
                                  It splits data randomly for regression, keeps categories balanced
                                  for classification, and uses earlier records for training and
                                  later records for testing with time series data.
                                </Content>
                              </>
                            )}
                            <Content component="p">
                              The system also uses part of the training data to choose the best
                              model, so you do not need to provide a separate validation file.
                            </Content>
                          </Content>
                        ),
                      }}
                    >
                      <Stack hasGutter>
                        <StackItem>
                          <Radio
                            id="dataset-split-auto"
                            name="dataset-split"
                            data-testid="dataset-split-auto"
                            label="Automatically split data"
                            description="Use a single dataset for both training and testing."
                            isChecked={datasetSplitMode !== DATASET_SPLIT_SEPARATE}
                            onChange={() => applyDatasetSplitMode(DATASET_SPLIT_AUTO)}
                            isDisabled={formIsSubmitting}
                          />
                        </StackItem>
                        <StackItem>
                          <Radio
                            id="dataset-split-separate"
                            name="dataset-split"
                            data-testid="dataset-split-separate"
                            label="Use separate datasets"
                            description="Provide individual files for training and testing."
                            isChecked={datasetSplitMode === DATASET_SPLIT_SEPARATE}
                            onChange={() => applyDatasetSplitMode(DATASET_SPLIT_SEPARATE)}
                            isDisabled={formIsSubmitting}
                          />
                        </StackItem>
                      </Stack>
                    </ConfigureFormGroup>
                  </StackItem>
                  <StackItem>
                    <Divider />
                  </StackItem>
                  <StackItem>
                    <Split hasGutter>
                      <SplitItem>
                        <Content component="h3">Documents</Content>
                      </SplitItem>
                      <SplitItem isFilled />
                      {datasetSplitMode === DATASET_SPLIT_SEPARATE && (
                        <SplitItem>
                          <Content component="small">
                            {selectedDatasetCount} of 2 datasets selected
                          </Content>
                        </SplitItem>
                      )}
                    </Split>
                    <Content component="p">
                      Select or upload the CSV file used to train your model. Choose from an
                      existing connection, create a new connection, or upload a file.
                    </Content>
                  </StackItem>
                  {datasetSplitMode !== DATASET_SPLIT_SEPARATE &&
                    renderConnectionSelector(
                      'Select the S3 connection that contains your training data, or add a new connection.',
                    )}
                  {datasetSplitMode !== DATASET_SPLIT_SEPARATE && newConnectionNotLoaded && (
                    <StackItem className="pf-v6-u-mt-md">
                      <Alert variant="warning" isInline title="Connection added">
                        The connection was created but could not be loaded. Please refresh the page
                        to see it.
                      </Alert>
                    </StackItem>
                  )}
                  {(Boolean(trainDataSecretName) ||
                    datasetSplitMode === DATASET_SPLIT_SEPARATE) && (
                    <>
                      {datasetSplitMode !== DATASET_SPLIT_SEPARATE && (
                        <StackItem>
                          <Divider />
                        </StackItem>
                      )}
                      {datasetSplitMode !== DATASET_SPLIT_SEPARATE && (
                        <>
                          <StackItem>
                            <Content component="h4">2. Choose a file</Content>
                          </StackItem>
                          <DatasetFilePicker
                            dataset="training"
                            testIdPrefix="training-data"
                            selectDescription="Select one CSV file from this bucket to use as training data for your experiment."
                            fileKey={trainDataFileKey}
                            selectedFile={selectedTrainingDataFile}
                            sourceMode={trainingDataSourceMode}
                            onSourceModeChange={setTrainingDataSourceMode}
                            onBrowse={() => {
                              setFileExplorerTarget('train');
                              setIsFileExplorerOpen(true);
                            }}
                            onRemoveSelection={() => {
                              setSelectedTrainingDataFile(undefined);
                              setValue('train_data_file_key', '', {
                                shouldValidate: true,
                              });
                            }}
                            canSelectFiles={canSelectFiles}
                            formIsSubmitting={formIsSubmitting}
                            isUploading={isTrainingDataFileUploading}
                            isUploadDropdownOpen={isTrainingDataUploadDropdownOpen}
                            onUploadDropdownOpenChange={setIsTrainingDataUploadDropdownOpen}
                            nativeInputRef={trainingDataNativeInputRef}
                            onNativeFileChange={(file) => {
                              void uploadTrainingDataFile(file);
                            }}
                            onDrop={processTrainingDataDropOutcome}
                            onClearUpload={clearTrainingDataUpload}
                            onReplaceUpload={openTrainingDataReplaceFileDialog}
                          />
                          {isFileSelected &&
                            !isTrainingDataFileUploading &&
                            !isLoadingColumns &&
                            !isFetchingColumns &&
                            !columnsError &&
                            !isFetchingRowCount &&
                            !rowCountError &&
                            trainingDataRowCount !== undefined &&
                            trainingSample &&
                            trainingSample.sampleSize > 0 &&
                            schemaColumns.length > 0 && (
                              <StackItem>
                                <HelperText aria-live="polite">
                                  <HelperTextItem
                                    variant="success"
                                    icon={<CheckCircleIcon />}
                                    data-testid="training-data-load-success"
                                  >
                                    {trainingSample.parseWarnings > 0 ? (
                                      <>
                                        File contains {trainingDataRowCount} data{' '}
                                        {trainingDataRowCount === 1 ? 'record' : 'records'}. Schema
                                        inferred from {trainingSample.sampleSize} sampled{' '}
                                        {trainingSample.sampleSize === 1 ? 'row' : 'rows'} with{' '}
                                        {schemaColumns.length}{' '}
                                        {schemaColumns.length === 1 ? 'column' : 'columns'}.
                                      </>
                                    ) : (
                                      <>
                                        Successfully loaded {trainingDataRowCount}{' '}
                                        {trainingDataRowCount === 1 ? 'row' : 'rows'} with{' '}
                                        {schemaColumns.length}{' '}
                                        {schemaColumns.length === 1 ? 'column' : 'columns'}
                                      </>
                                    )}
                                  </HelperTextItem>
                                </HelperText>
                              </StackItem>
                            )}
                          {isFileSelected &&
                            !isTrainingDataFileUploading &&
                            !isFetchingColumns &&
                            !columnsError &&
                            trainingSample &&
                            trainingSample.parseWarnings > 0 && (
                              <StackItem>
                                <HelperText aria-live="polite">
                                  <HelperTextItem
                                    variant="warning"
                                    data-testid="training-data-sampling-warning"
                                  >
                                    Skipped {trainingSample.parseWarnings} malformed{' '}
                                    {trainingSample.parseWarnings === 1 ? 'record' : 'records'}{' '}
                                    while sampling the schema. The whole-file record count may
                                    include these records. Review the file before continuing.
                                  </HelperTextItem>
                                </HelperText>
                              </StackItem>
                            )}
                          {isFileSelected && rowCountError && !columnsError && (
                            <StackItem>
                              <HelperText aria-live="polite">
                                <HelperTextItem variant="warning">
                                  Unable to count rows. {rowCountError.message}
                                </HelperTextItem>
                              </HelperText>
                            </StackItem>
                          )}
                        </>
                      )}
                      {datasetSplitMode === DATASET_SPLIT_SEPARATE && (
                        <>
                          <StackItem>
                            <Accordion
                              asDefinitionList={false}
                              togglePosition="end"
                              className="automl-configure__dataset-accordion"
                            >
                              <AccordionItem isExpanded={isTrainingAccordionExpanded}>
                                <AccordionToggle
                                  id="training-data-accordion-toggle"
                                  aria-controls="training-data-accordion-content"
                                  onFocus={() => setFocusedDataset('training')}
                                  onBlur={() => setFocusedDataset(undefined)}
                                  data-testid="training-data-accordion-toggle"
                                  onClick={() => {
                                    const isExpanding = !isTrainingAccordionExpanded;
                                    setIsTrainingAccordionExpanded(isExpanding);
                                    if (isExpanding) {
                                      setIsTestAccordionExpanded(false);
                                    }
                                  }}
                                >
                                  <Split hasGutter>
                                    <SplitItem className="pf-v6-u-text-nowrap">
                                      <strong>1. Training data</strong>
                                    </SplitItem>
                                    <SplitItem
                                      isFilled
                                      className="automl-configure__dataset-status pf-v6-u-font-weight-normal"
                                    >
                                      <Flex
                                        flexWrap={{ default: 'nowrap' }}
                                        spaceItems={{ default: 'spaceItemsSm' }}
                                        alignItems={{ default: 'alignItemsCenter' }}
                                        justifyContent={{ default: 'justifyContentFlexEnd' }}
                                      >
                                        <FlexItem>
                                          {columnsError && trainDataFileKey ? (
                                            <ExclamationCircleIcon color="var(--pf-t--global--icon--color--status--danger--default)" />
                                          ) : trainDataFileKey ? (
                                            <CheckCircleIcon color="var(--pf-t--global--icon--color--status--success--default)" />
                                          ) : (
                                            <ExclamationTriangleIcon color="var(--pf-t--global--icon--color--regular)" />
                                          )}
                                        </FlexItem>
                                        <FlexItem
                                          id="training-data-filename"
                                          className="automl-configure__dataset-status pf-v6-u-text-truncate"
                                        >
                                          {selectedTrainingDataFile?.name ??
                                            (trainDataFileKey || 'Incomplete')}
                                        </FlexItem>
                                      </Flex>
                                    </SplitItem>
                                  </Split>
                                </AccordionToggle>
                                {trainDataFileKey && (
                                  <Tooltip
                                    position="top"
                                    trigger="mouseenter"
                                    isVisible={focusedDataset === 'training'}
                                    aria="none"
                                    content={selectedTrainingDataFile?.name ?? trainDataFileKey}
                                    triggerRef={() =>
                                      document.getElementById('training-data-filename')!
                                    }
                                  />
                                )}
                                <AccordionContent id="training-data-accordion-content">
                                  <Stack hasGutter>
                                    <StackItem>
                                      <Content component="p">
                                        Select or upload the CSV file used to train your model.
                                        Choose from an existing connection, create a new connection,
                                        or upload a file.
                                      </Content>
                                    </StackItem>
                                    {renderConnectionSelector(
                                      SHARED_DATA_CONNECTION_DESCRIPTION,
                                      'training-data-aws-secret-selector',
                                    )}
                                    {newConnectionNotLoaded && (
                                      <StackItem>
                                        <Alert variant="warning" isInline title="Connection added">
                                          The connection was created but could not be loaded. Please
                                          refresh the page to see it.
                                        </Alert>
                                      </StackItem>
                                    )}
                                    {Boolean(trainDataSecretName) && (
                                      <>
                                        <StackItem>
                                          <Divider />
                                        </StackItem>
                                        <StackItem>
                                          <Content component="h4">2. Choose a file</Content>
                                        </StackItem>
                                        <DatasetFilePicker
                                          dataset="training"
                                          testIdPrefix="training-data"
                                          selectDescription="Select one CSV file from this bucket to use as training data for your experiment."
                                          fileKey={trainDataFileKey}
                                          selectedFile={selectedTrainingDataFile}
                                          sourceMode={trainingDataSourceMode}
                                          onSourceModeChange={setTrainingDataSourceMode}
                                          onBrowse={() => {
                                            setFileExplorerTarget('train');
                                            setIsFileExplorerOpen(true);
                                          }}
                                          onRemoveSelection={() => {
                                            setSelectedTrainingDataFile(undefined);
                                            setValue('train_data_file_key', '', {
                                              shouldValidate: true,
                                            });
                                          }}
                                          canSelectFiles={canSelectFiles}
                                          formIsSubmitting={formIsSubmitting}
                                          isUploading={isTrainingDataFileUploading}
                                          isUploadDropdownOpen={isTrainingDataUploadDropdownOpen}
                                          onUploadDropdownOpenChange={
                                            setIsTrainingDataUploadDropdownOpen
                                          }
                                          nativeInputRef={trainingDataNativeInputRef}
                                          onNativeFileChange={(file) => {
                                            void uploadTrainingDataFile(file);
                                          }}
                                          onDrop={processTrainingDataDropOutcome}
                                          onClearUpload={clearTrainingDataUpload}
                                          onReplaceUpload={openTrainingDataReplaceFileDialog}
                                        />
                                        {columnsError && (
                                          <StackItem>
                                            <DatasetSamplingError
                                              onRetry={() => {
                                                void refetchTrainingSample();
                                              }}
                                              error={columnsError}
                                              isRetrying={isFetchingColumns}
                                            />
                                          </StackItem>
                                        )}
                                      </>
                                    )}
                                  </Stack>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </StackItem>
                          <StackItem>
                            <Accordion
                              asDefinitionList={false}
                              togglePosition="end"
                              className="automl-configure__dataset-accordion"
                            >
                              <AccordionItem isExpanded={isTestAccordionExpanded}>
                                <AccordionToggle
                                  id="test-data-accordion-toggle"
                                  aria-controls="test-data-accordion-content"
                                  onFocus={() => setFocusedDataset('test')}
                                  onBlur={() => setFocusedDataset(undefined)}
                                  data-testid="test-data-accordion-toggle"
                                  onClick={() => {
                                    const isExpanding = !isTestAccordionExpanded;
                                    setIsTestAccordionExpanded(isExpanding);
                                    if (isExpanding) {
                                      setIsTrainingAccordionExpanded(false);
                                    }
                                  }}
                                >
                                  <Split hasGutter>
                                    <SplitItem className="pf-v6-u-text-nowrap">
                                      <strong>2. Test data</strong>
                                    </SplitItem>
                                    <SplitItem
                                      isFilled
                                      className="automl-configure__dataset-status pf-v6-u-font-weight-normal"
                                    >
                                      <Flex
                                        flexWrap={{ default: 'nowrap' }}
                                        spaceItems={{ default: 'spaceItemsSm' }}
                                        alignItems={{ default: 'alignItemsCenter' }}
                                        justifyContent={{ default: 'justifyContentFlexEnd' }}
                                      >
                                        <FlexItem>
                                          {(testSampleQuery.error && testDataFileKey) ||
                                          hasIdenticalDatasetFiles ? (
                                            <ExclamationCircleIcon color="var(--pf-t--global--icon--color--status--danger--default)" />
                                          ) : testDataFileKey ? (
                                            <CheckCircleIcon color="var(--pf-t--global--icon--color--status--success--default)" />
                                          ) : (
                                            <ExclamationTriangleIcon color="var(--pf-t--global--icon--color--regular)" />
                                          )}
                                        </FlexItem>
                                        <FlexItem
                                          id="test-data-filename"
                                          className="automl-configure__dataset-status pf-v6-u-text-truncate"
                                        >
                                          {selectedTestDataFile?.name ??
                                            (testDataFileKey || 'Incomplete')}
                                        </FlexItem>
                                      </Flex>
                                    </SplitItem>
                                  </Split>
                                </AccordionToggle>
                                {testDataFileKey && (
                                  <Tooltip
                                    position="top"
                                    trigger="mouseenter"
                                    isVisible={focusedDataset === 'test'}
                                    aria="none"
                                    content={selectedTestDataFile?.name ?? testDataFileKey}
                                    triggerRef={() =>
                                      document.getElementById('test-data-filename')!
                                    }
                                  />
                                )}
                                <AccordionContent id="test-data-accordion-content">
                                  <Stack hasGutter>
                                    <StackItem>
                                      <Content component="p">
                                        Select or upload the CSV file used to test your model.
                                        Choose from an existing connection, create a new connection,
                                        or upload a file.
                                      </Content>
                                    </StackItem>
                                    {renderConnectionSelector(
                                      SHARED_DATA_CONNECTION_DESCRIPTION,
                                      'test-data-aws-secret-selector',
                                    )}
                                    {newConnectionNotLoaded && (
                                      <StackItem>
                                        <Alert variant="warning" isInline title="Connection added">
                                          The connection was created but could not be loaded. Please
                                          refresh the page to see it.
                                        </Alert>
                                      </StackItem>
                                    )}
                                    {Boolean(trainDataSecretName) && (
                                      <>
                                        <StackItem>
                                          <Divider />
                                        </StackItem>
                                        <StackItem>
                                          <Content component="h4">2. Choose a file</Content>
                                        </StackItem>
                                        <DatasetFilePicker
                                          dataset="test"
                                          testIdPrefix="test-data"
                                          selectDescription="Select one CSV file from this bucket to use as test data for your experiment."
                                          fileKey={testDataFileKey ?? ''}
                                          selectedFile={selectedTestDataFile}
                                          sourceMode={testDataSourceMode}
                                          onSourceModeChange={setTestDataSourceMode}
                                          onBrowse={() => {
                                            setFileExplorerTarget('test');
                                            setIsFileExplorerOpen(true);
                                          }}
                                          onRemoveSelection={() => {
                                            setSelectedTestDataFile(undefined);
                                            setValue('test_data_file_key', '', {
                                              shouldValidate: true,
                                            });
                                          }}
                                          canSelectFiles={canSelectFiles}
                                          formIsSubmitting={formIsSubmitting}
                                          isUploading={isTestDataFileUploading}
                                          isUploadDropdownOpen={isTestDataUploadDropdownOpen}
                                          onUploadDropdownOpenChange={
                                            setIsTestDataUploadDropdownOpen
                                          }
                                          nativeInputRef={testDataNativeInputRef}
                                          onNativeFileChange={(file) => {
                                            void uploadTestDataFile(file);
                                          }}
                                          onDrop={processTestDataDropOutcome}
                                          onClearUpload={clearTestDataUpload}
                                          onReplaceUpload={openTestDataReplaceFileDialog}
                                        />
                                        {testDataFileError && !hasIdenticalDatasetFiles && (
                                          <StackItem>
                                            <HelperText>
                                              <HelperTextItem variant="error">
                                                {testDataFileError}
                                              </HelperTextItem>
                                            </HelperText>
                                          </StackItem>
                                        )}
                                        {testSampleQuery.error && (
                                          <StackItem>
                                            <DatasetSamplingError
                                              onRetry={() => {
                                                void testSampleQuery.refetch();
                                              }}
                                              error={testSampleQuery.error}
                                              isRetrying={testSampleQuery.isFetching}
                                            />
                                          </StackItem>
                                        )}
                                      </>
                                    )}
                                  </Stack>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                            {hasIdenticalDatasetFiles && (
                              <HelperText className="pf-v6-u-mt-sm">
                                <HelperTextItem variant="error">{testDataFileError}</HelperTextItem>
                              </HelperText>
                            )}
                          </StackItem>
                          <StackItem>
                            <DatasetCompatibilityCheck
                              key={`${namespace}/${trainDataSecretName}/${trainDataBucketName}/${trainDataFileKey}/${testDataFileKey}`}
                              training={trainingSample}
                              test={testSampleQuery.sample}
                              trainingFile={trainDataFileKey}
                              testFile={testDataFileKey ?? ''}
                              isChecking={
                                isFetchingColumns ||
                                testSampleQuery.isFetching ||
                                isTrainingDataFileUploading ||
                                isTestDataFileUploading
                              }
                              isCovered={Boolean(previewFileKey)}
                              hasError={Boolean(columnsError || testSampleQuery.error)}
                              onViewFile={setPreviewFileKey}
                            />
                          </StackItem>
                        </>
                      )}
                    </>
                  )}
                </Stack>
              </CardBody>
            </div>
          </Card>
        </GridItem>
        <GridItem span={12} lg={7} xl2={8}>
          <Card className="pf-v6-u-p-xs" isFullHeight>
            <div style={{ overflow: 'auto' }}>
              <CardHeader>
                <Content component="h3">Configure details</Content>
              </CardHeader>
              <CardBody>
                {!areDocumentsComplete ? (
                  <EmptyState
                    variant="xs"
                    titleText={
                      datasetSplitMode === DATASET_SPLIT_SEPARATE
                        ? 'Complete the Documents section'
                        : 'Select a file from your S3 connection or upload a file to get started'
                    }
                    headingLevel="h4"
                    icon={CubesIcon}
                  >
                    <EmptyStateBody>
                      {datasetSplitMode === DATASET_SPLIT_SEPARATE
                        ? 'Select training and test data before configuring your prediction task.'
                        : 'In order to configure details and run an experiment, select a file or upload one in the Documents section.'}
                    </EmptyStateBody>
                  </EmptyState>
                ) : (
                  <Stack hasGutter style={{ gap: 'var(--pf-t--global--spacer--xl)' }}>
                    <StackItem className="automl-configure__form-field">
                      <ConfigureFormGroup
                        label="Target column"
                        description="Select the column containing the values you want to predict."
                        labelHelp={{
                          header: 'Target column',
                          body: (
                            <Stack hasGutter>
                              <StackItem>
                                The target column contains the values you want to predict. Other
                                columns in your dataset are used as inputs.
                              </StackItem>
                              <StackItem>
                                Look for a column with outcomes (like sales_total) or categories
                                (like approved/denied) that you want your model to learn to predict.
                              </StackItem>
                            </Stack>
                          ),
                        }}
                        isRequired
                      >
                        <LoadingFormField loading={isLoadingColumns || isFetchingColumns}>
                          <Controller
                            control={control}
                            name="target_column"
                            render={({ field }) => (
                              <Select
                                id="target-column-select"
                                isOpen={isTargetColumnOpen}
                                onOpenChange={setIsTargetColumnOpen}
                                onSelect={(_event, value) => {
                                  field.onChange(value);
                                  setIsTargetColumnOpen(false);
                                  if (typeof value === 'string') {
                                    const selected = columns.find((c) => c.name === value);
                                    const inferred = getInferredPredictionType(selected, columns);
                                    if (inferred) {
                                      setValue('task_type', inferred, { shouldValidate: true });
                                    }
                                    // Fired here, from the actual selection, rather than from an
                                    // effect watching target_column — a pre-populated reconfigure
                                    // value must not be mistaken for a user action, and this handler
                                    // only ever runs in response to one.
                                    if (!hasFiredTargetColumnMilestoneRef.current) {
                                      hasFiredTargetColumnMilestoneRef.current = true;
                                      fireAutomlTargetColumnConfigured(trackEvent);
                                    }
                                    // Surface configure-step progress to the page so exit tracking
                                    // (cancel/abandon/breadcrumb) reports how far the user actually
                                    // got. Selecting the target column unlocks the prediction type
                                    // section, so it's the signal that the user has moved past
                                    // 'trainingData' into 'predictionType'.
                                    onFunnelStepChange?.('predictionType');
                                  }
                                }}
                                selected={field.value}
                                maxMenuHeight="200px"
                                toggle={(toggleRef) => (
                                  <MenuToggle
                                    ref={toggleRef}
                                    onClick={() => setIsTargetColumnOpen((prev) => !prev)}
                                    isExpanded={isTargetColumnOpen}
                                    isDisabled={
                                      columns.length === 0 || !!columnsError || formIsSubmitting
                                    }
                                    isFullWidth
                                    data-testid="target_column-select"
                                    status={columnsError ? 'danger' : undefined}
                                  >
                                    {field.value || 'Select a column'}
                                  </MenuToggle>
                                )}
                              >
                                <SelectList>
                                  {columns.map((column) => (
                                    <SelectOption key={column.name} value={column.name}>
                                      <span className="automl-configure__column-type-badge">
                                        {getTypeAcronym(column.type)}
                                      </span>
                                      {column.name}
                                    </SelectOption>
                                  ))}
                                </SelectList>
                              </Select>
                            )}
                          />
                          {columnsError && (
                            <FormHelperText>
                              <HelperText>
                                <HelperTextItem variant="error">
                                  {columnsError.message}
                                </HelperTextItem>
                              </HelperText>
                            </FormHelperText>
                          )}
                          {!columnsError && filteredNonASCIIColumnCount > 0 && (
                            <Alert
                              variant="info"
                              isInline
                              isPlain
                              title={formatFilteredNonASCIIColumnsMessage(
                                filteredNonASCIIColumnCount,
                              )}
                              data-testid="non-ascii-columns-filtered-helper"
                            />
                          )}
                        </LoadingFormField>
                        {isTargetColumnSelected && (
                          <AutomlPredictionTypeHelperText
                            targetColumn={targetColumn}
                            selectedColumn={selectedColumn}
                          />
                        )}
                      </ConfigureFormGroup>
                    </StackItem>

                    <StackItem className="automl-configure__form-field">
                      <ConfigureFormGroup
                        label="Prediction type"
                        isRequired
                        description="Select the type of prediction to use for this run. Recommended types are determined based on the number of unique values detected in the selected target column."
                      >
                        {!isTargetColumnSelected && (
                          <FormHelperText data-testid="prediction-type-helper-no-target">
                            <HelperText>
                              <HelperTextItem variant="indeterminate">
                                To view prediction type options, first complete the Target column
                                field.
                              </HelperTextItem>
                            </HelperText>
                          </FormHelperText>
                        )}
                        {isTargetColumnSelected && (
                          <Controller
                            control={form.control}
                            name="task_type"
                            render={({ field }) => (
                              <AutomlPredictionTypeSelector
                                columnCount={schemaColumns.length}
                                value={field.value}
                                onChange={field.onChange}
                                onClearTimeseriesTimestamp={() =>
                                  setValue('timestamp_column', '', { shouldValidate: true })
                                }
                                selectedColumn={selectedColumn}
                                columns={columns}
                                isDisabled={!canSelectLearningType || formIsSubmitting}
                              />
                            )}
                          />
                        )}
                      </ConfigureFormGroup>
                    </StackItem>

                    {isTaskTypeSelected && isTimeseries && (
                      <ConfigureTimeseriesForm
                        columnCount={schemaColumns.length}
                        columns={columns}
                        isLoadingColumns={isLoadingColumns}
                        isFetchingColumns={isFetchingColumns}
                        columnsError={columnsError}
                        isFileSelected={isFileSelected}
                        formIsSubmitting={formIsSubmitting}
                      />
                    )}

                    {isTaskTypeSelected && (
                      <StackItem className="automl-configure__form-field">
                        <ConfigureFormGroup
                          label="Run preset"
                          description="Choose a predefined resource allocation and optimization strategy for this run."
                        >
                          <Controller
                            control={form.control}
                            name="preset"
                            render={({ field }) => (
                              <Flex direction={{ default: 'column' }}>
                                {availablePresets.map((preset) => (
                                  <Radio
                                    key={preset}
                                    id={`preset-${preset}`}
                                    name="preset"
                                    label={PRESET_LABELS[preset]}
                                    description={
                                      preset === PRESET_FASTER ? (
                                        <>
                                          4 vCPU / 16 GiB
                                          <br />
                                          {isTimeseries
                                            ? '10-minute model-selection budget.'
                                            : '45-minute model-selection budget.'}
                                          <br />
                                          Use fewer resources to prioritize speed
                                        </>
                                      ) : preset === PRESET_BETTER_QUALITY ? (
                                        <>
                                          8 vCPU / 32 GiB
                                          <br />
                                          {isTimeseries
                                            ? 'Up to 1 hour for model selection.'
                                            : 'Up to 3 hours for model selection.'}
                                          <br />
                                          Use more resources to prioritize accuracy
                                        </>
                                      ) : isTimeseries ? (
                                        <>
                                          16 vCPU / 64 GiB
                                          <br />
                                          Up to 2 hours for model selection; data loading and refit
                                          may extend total run time. Samples up to 10 GiB.
                                          <br />
                                          Choose for large datasets when maximum model search
                                          quality is worth the longer run and higher resource use.
                                        </>
                                      ) : (
                                        <>
                                          16 vCPU / 64 GiB
                                          <br />
                                          Up to 6 hours for model selection, plus data loading and
                                          refit; samples up to 10 GiB.
                                          <br />
                                          Choose for large datasets when maximum model search
                                          quality is worth the longer run and higher resource use.
                                        </>
                                      )
                                    }
                                    isChecked={field.value === preset}
                                    isDisabled={formIsSubmitting}
                                    onChange={() => field.onChange(preset)}
                                    data-testid={`preset-radio-${preset}`}
                                  />
                                ))}
                              </Flex>
                            )}
                          />
                        </ConfigureFormGroup>
                      </StackItem>
                    )}

                    {isTaskTypeSelected && (
                      <StackItem className="automl-configure__form-field">
                        <ConfigureFormGroup
                          label="Top models to consider"
                          labelHelp={{
                            header: 'Top models to consider',
                            body: 'Number of top models to select and refit. The pipeline will train multiple models and select the best performing ones for final training.',
                          }}
                        >
                          <Controller
                            control={form.control}
                            name="top_n"
                            render={({ field, fieldState }) => (
                              <>
                                <NumberInput
                                  id="top-n-input"
                                  value={field.value}
                                  min={MIN_TOP_N}
                                  max={maxTopN}
                                  isDisabled={formIsSubmitting}
                                  validated={fieldState.error ? 'error' : 'default'}
                                  onMinus={() => field.onChange(Number(field.value) - 1)}
                                  onPlus={() => field.onChange(Number(field.value) + 1)}
                                  onChange={(event: React.FormEvent<HTMLInputElement>) => {
                                    const value = parseInt(event.currentTarget.value, 10);
                                    if (!Number.isNaN(value)) {
                                      field.onChange(value);
                                    }
                                  }}
                                  data-testid="top-n-input"
                                />
                                {fieldState.error && (
                                  <FormHelperText>
                                    <HelperText>
                                      <HelperTextItem variant="error">
                                        {fieldState.error.message}
                                      </HelperTextItem>
                                    </HelperText>
                                  </FormHelperText>
                                )}
                              </>
                            )}
                          />
                        </ConfigureFormGroup>
                      </StackItem>
                    )}

                    {isTaskTypeSelected && (
                      <>
                        <Divider />
                        <StackItem>
                          <Card data-testid="optimization-metric-card">
                            <CardHeader>
                              <Split hasGutter className="pf-v6-u-w-100">
                                <SplitItem isFilled>
                                  <CardTitle>Optimization Metric</CardTitle>
                                </SplitItem>
                                <SplitItem>
                                  <Button
                                    variant="secondary"
                                    isDisabled={formIsSubmitting}
                                    onClick={() => setIsMetricModalOpen(true)}
                                    data-testid="optimization-metric-edit"
                                  >
                                    Edit
                                  </Button>
                                </SplitItem>
                              </Split>
                            </CardHeader>
                            <CardBody>
                              <Content component="p" data-testid="optimization-metric-value">
                                {formatMetricName(evalMetric ?? '')}
                              </Content>
                            </CardBody>
                          </Card>
                        </StackItem>
                      </>
                    )}
                  </Stack>
                )}
              </CardBody>
            </div>
          </Card>
        </GridItem>
      </Grid>

      {isConnectionModalOpen && (
        <ConnectionModal
          connectionTypes={automlConnectionTypes}
          project={namespace}
          onClose={() => {
            setIsConnectionModalOpen(false);
          }}
          onSubmit={async (connection: Connection) => {
            const refresh = secretsRefreshRef.current;
            if (!refresh) {
              return;
            }
            const list = await refresh();
            const secret = list?.find((s) => s.name === connection.metadata.name);
            if (secret) {
              setNewConnectionNotLoaded(false);
              const requiredKeys = REQUIRED_CONNECTION_SECRET_KEYS[secret.type ?? ''];
              const secretData = secret.data ?? connection.stringData ?? {};
              const invalid = requiredKeys
                ? getMissingRequiredKeys(requiredKeys, Object.keys(secretData)).length > 0
                : true;
              setSelectedSecret({
                ...secret,
                data: secretData,
                invalid,
              });
              setValue('train_data_secret_name', invalid ? '' : secret.name, {
                shouldValidate: true,
              });
            } else {
              setNewConnectionNotLoaded(true);
            }
          }}
          onOutcome={(outcome) =>
            fireAutomlS3ConnectionCreated(trackEvent, {
              outcome:
                outcome.outcome === 'submit' ? TrackingOutcome.submit : TrackingOutcome.cancel,
              ...(outcome.success === false && { error: 'actionFailed' }),
              ...(outcome.success !== undefined && { success: outcome.success }),
            })
          }
          getCreateError={(error) => (error instanceof Error ? error : new Error(String(error)))}
          getSubmitError={(error) => (error instanceof Error ? error : new Error(String(error)))}
        />
      )}
      <S3FileExplorer
        id={`AutoMLConfigure-S3FileExplorer-${fileExplorerTarget}`}
        apiPath="/automl/api/v1/s3"
        presentation="tearsheet"
        isCovered={Boolean(previewFileKey)}
        bucket={trainDataBucketName}
        renderFilePreview={(file) =>
          file.type.toLowerCase() === 'csv' ? (
            <DatasetFileDetailsPreview
              key={file.path}
              namespace={namespace}
              secretName={trainDataSecretName}
              bucket={trainDataBucketName}
              fileKey={file.path.replace(/^\//, '')}
              onViewFile={() => setPreviewFileKey(file.path.replace(/^\//, ''))}
            />
          ) : null
        }
        namespace={namespace}
        s3SecretName={trainDataSecretName}
        isOpen={isFileExplorerOpen}
        onClose={() => setIsFileExplorerOpen(false)}
        onSelectFiles={(files) => {
          if (files.length > 0) {
            const file = files[0];
            const filePath = file.path.replace(/^\//, '');
            if (fileExplorerTarget === 'test') {
              if (filePath !== testDataFileKey) {
                pendingTestDataCollapseRef.current = filePath;
              }
              setValue('test_data_file_key', filePath, { shouldValidate: true });
              setSelectedTestDataFile(file);
            } else {
              if (filePath !== trainDataFileKey) {
                pendingTrainingDataCollapseRef.current = filePath;
              }
              setValue('train_data_file_key', filePath, { shouldValidate: true });
              setSelectedTrainingDataFile(file);
              fireTrainingDataMilestoneOnce('select');
            }
          }
        }}
        allowFolderSelection={false}
        selectableExtensions={['csv']}
        unselectableReason="You can only select CSV files"
        disabledPaths={{
          '/autogluon-tabular-training-pipeline': SYSTEM_FOLDER_DISABLED_REASON,
          '/autogluon-timeseries-training-pipeline': SYSTEM_FOLDER_DISABLED_REASON,
        }}
      />
      {previewFileKey && (
        <DatasetFilePreview
          key={`${namespace}/${trainDataSecretName}/${trainDataBucketName}/${previewFileKey}`}
          namespace={namespace}
          secretName={trainDataSecretName}
          bucket={trainDataBucketName}
          fileKey={previewFileKey}
          onClose={() => setPreviewFileKey(undefined)}
        />
      )}
      <OptimizationMetricModal
        isOpen={isMetricModalOpen}
        onSave={(metric) => {
          setValue('eval_metric', metric, { shouldValidate: true });
          setIsMetricModalOpen(false);
        }}
        onCancel={() => setIsMetricModalOpen(false)}
      />
    </>
  );
}

export default AutomlConfigure;
