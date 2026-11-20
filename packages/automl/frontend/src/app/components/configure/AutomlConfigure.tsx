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
  Dropdown,
  DropdownItem,
  DropdownList,
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
  MultipleFileUpload,
  MultipleFileUploadMain,
  NumberInput,
  Radio,
  Select,
  SelectList,
  SelectOption,
  Split,
  SplitItem,
  Spinner,
  Stack,
  StackItem,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  Truncate,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import {
  CheckCircleIcon,
  CubesIcon,
  EllipsisVIcon,
  ExclamationTriangleIcon,
  TimesIcon,
  UploadIcon,
} from '@patternfly/react-icons';
import type { FileRejection } from 'react-dropzone';
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
import { useS3FileUploadMutation } from '@odh-dashboard/autox-core/ui/hooks';
import { getMissingRequiredKeys } from '@odh-dashboard/autox-core/ui/utils';
import { getInferredPredictionType } from '~/app/utilities/predictionTypeUtils';
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
  PRESET_QUALITY,
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
import {
  AUTOML_TRAINING_UPLOAD_MAX_BYTES,
  AUTOML_TRAINING_UPLOAD_MAX_FILES,
  AUTOML_TRAINING_UPLOAD_MAX_SIZE_MIB,
  AUTOML_TRAINING_UPLOAD_TOO_LARGE_DETAIL,
  getTrainingDataDropRejectedNotification,
  isAllowedTrainingDataUploadFile,
  resolveSingleFileDropOutcome,
  TRAINING_DATA_FILE_ACCEPT,
  TRAINING_DATA_UPLOAD_NATIVE_ACCEPT,
} from '~/app/utilities/automlTrainingDataFile';
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
import DatasetFilePicker, { type DatasetFileSourceMode } from './DatasetFilePicker';
import './AutomlConfigure.scss';

const SYSTEM_FOLDER_DISABLED_REASON = 'This is a system folder and cannot be selected.';
const SHARED_DATA_CONNECTION_DESCRIPTION =
  'Training and test data use the same S3 connection and bucket. Changing the connection clears both file selections.';

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
  /** Reports whether the currently selected prediction type matches the recommendation derived from the target column. */
  onRecommendationChange?: (isRecommended: boolean) => void;
  /** Reports the furthest configure-step section the user has reached, for funnel exit tracking. */
  onFunnelStepChange?: (step: AutomlFunnelStep) => void;
};

function AutomlConfigure({
  initialInputDataSecret,
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
    formState: { isSubmitting: formIsSubmitting },
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
  const [fileExplorerTarget, setFileExplorerTarget] = useState<'train' | 'test'>('train');
  const [isTrainingAccordionExpanded, setIsTrainingAccordionExpanded] = useState(false);
  const [isTestAccordionExpanded, setIsTestAccordionExpanded] = useState(false);
  const initialFileKey = getValues('train_data_file_key');
  const initialTestFileKey = getValues('test_data_file_key');

  const [selectedSecret, setSelectedSecret] = useState<SecretSelection | undefined>(
    initialInputDataSecret,
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
  const trainingDataNativeInputRef = useRef<HTMLInputElement>(null);
  const [selectedTestDataFile, setSelectedTestDataFile] = useState<ExplorerFile | undefined>(() =>
    explorerFileFromKey(initialTestFileKey),
  );
  const [isTestDataFileUploading, setIsTestDataFileUploading] = useState(false);
  const [isTestDataUploadDropdownOpen, setIsTestDataUploadDropdownOpen] = useState(false);
  const testDataUploadSeqRef = useRef(0);
  const testDataNativeInputRef = useRef<HTMLInputElement>(null);
  const secretsRefreshRef = useRef<(() => Promise<SecretListItem[] | undefined>) | null>(null);
  // Initialized from initialFileKey so the file-change effect treats the pre-populated
  // value as the baseline in reconfigure and Back → Next flows, preventing an unnecessary reset on mount.
  const previousFileKeyRef = useRef<string | undefined>(initialFileKey);

  const notification = useNotification();

  const { mutateAsync: uploadFileToS3 } = useS3FileUploadMutation('');

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

  // Normalize unsupported presets on initial values as well as when switching to timeseries.
  useEffect(() => {
    if (isTimeseries && getValues('preset') === PRESET_QUALITY) {
      setValue('preset', PRESET_FASTER, { shouldValidate: true });
    }
  }, [isTimeseries, getValues, setValue]);

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
  }, [taskType, isTaskTypeSelected, isTimeseries, getValues, setValue, trigger]);

  const canSelectFiles = !selectedSecret?.invalid && Boolean(trainDataSecretName);
  const isFileSelected = Boolean(trainDataFileKey);
  const showTrainingDataUploadDropzone = !isTrainingDataFileUploading && !trainDataFileKey.trim();
  const areDocumentsComplete =
    isFileSelected &&
    (datasetSplitMode !== DATASET_SPLIT_SEPARATE || Boolean(testDataFileKey?.trim()));
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
  } = useS3GetFileSchemaQuery(
    namespace ?? '',
    trainDataSecretName,
    trainDataBucketName,
    trainDataFileKey,
  );

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
    if (columnsError) {
      notification.warning('Column schema error', columnsError.message);
    }
  }, [columnsError, notification]);

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

  // reset selected file values if secret or bucket changes (skips mount to preserve reconfigure)
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
  }, [trainDataSecretName, trainDataBucketName, setValue]);

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

  const uploadTrainingDataFile = useCallback(
    async (file?: File) => {
      if (!file || !namespace) {
        return;
      }
      if (file.size > AUTOML_TRAINING_UPLOAD_MAX_BYTES) {
        notification.error('File too large', AUTOML_TRAINING_UPLOAD_TOO_LARGE_DETAIL);
        return;
      }
      if (!isAllowedTrainingDataUploadFile(file)) {
        notification.error('Invalid file type', 'File type must be CSV.');
        return;
      }
      const uploadRequestId = ++trainingDataUploadSeqRef.current;
      setValue('train_data_file_key', '', { shouldValidate: true });
      setIsTrainingDataUploadDropdownOpen(false);
      setIsTrainingDataFileUploading(true);
      try {
        const uploadResult = await uploadFileToS3({
          namespace,
          secretName: trainDataSecretName,
          bucket: trainDataBucketName,
          key: file.name,
          file,
        });
        if (uploadRequestId !== trainingDataUploadSeqRef.current) {
          return;
        }
        setValue('train_data_file_key', uploadResult.key, { shouldValidate: true });
        fireTrainingDataMilestoneOnce('upload');
      } catch (err) {
        if (uploadRequestId === trainingDataUploadSeqRef.current) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          const isConflict = errorMessage.toLowerCase().includes('unique filename');

          notification.error(
            'Failed to upload file',
            isConflict
              ? 'A file with this name already exists and no unique name could be generated. Please rename your file or delete existing files with similar names.'
              : errorMessage,
          );
        }
      } finally {
        if (uploadRequestId === trainingDataUploadSeqRef.current) {
          setIsTrainingDataFileUploading(false);
        }
      }
    },
    [
      namespace,
      notification,
      setValue,
      trainDataBucketName,
      trainDataSecretName,
      uploadFileToS3,
      fireTrainingDataMilestoneOnce,
    ],
  );

  const handleTrainingDataDropRejected = useCallback(
    (fileRejections: FileRejection[]) => {
      const payload = getTrainingDataDropRejectedNotification(fileRejections);
      if (payload) {
        notification.error(payload.title, payload.description);
      }
    },
    [notification],
  );

  const processTrainingDataDropOutcome = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      const outcome = resolveSingleFileDropOutcome(acceptedFiles, fileRejections);
      if (outcome.kind === 'reject') {
        handleTrainingDataDropRejected(outcome.fileRejections);
      } else if (outcome.kind === 'upload') {
        void uploadTrainingDataFile(outcome.file);
      }
    },
    [handleTrainingDataDropRejected, uploadTrainingDataFile],
  );

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

  const uploadTestDataFile = useCallback(
    async (file?: File) => {
      if (!file || !namespace) {
        return;
      }
      if (file.size > AUTOML_TRAINING_UPLOAD_MAX_BYTES) {
        notification.error('File too large', AUTOML_TRAINING_UPLOAD_TOO_LARGE_DETAIL);
        return;
      }
      if (!isAllowedTrainingDataUploadFile(file)) {
        notification.error('Invalid file type', 'File type must be CSV.');
        return;
      }
      const uploadRequestId = ++testDataUploadSeqRef.current;
      setValue('test_data_file_key', '', { shouldValidate: true });
      setIsTestDataUploadDropdownOpen(false);
      setIsTestDataFileUploading(true);
      try {
        const uploadResult = await uploadFileToS3({
          namespace,
          secretName: trainDataSecretName,
          bucket: trainDataBucketName,
          key: file.name,
          file,
        });
        if (uploadRequestId !== testDataUploadSeqRef.current) {
          return;
        }
        setValue('test_data_file_key', uploadResult.key, { shouldValidate: true });
        setSelectedTestDataFile(explorerFileFromKey(uploadResult.key));
      } catch (err) {
        if (uploadRequestId === testDataUploadSeqRef.current) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          const isConflict = errorMessage.toLowerCase().includes('unique filename');
          notification.error(
            'Failed to upload file',
            isConflict
              ? 'A file with this name already exists and no unique name could be generated. Please rename your file or delete existing files with similar names.'
              : errorMessage,
          );
        }
      } finally {
        if (uploadRequestId === testDataUploadSeqRef.current) {
          setIsTestDataFileUploading(false);
        }
      }
    },
    [namespace, notification, setValue, trainDataBucketName, trainDataSecretName, uploadFileToS3],
  );

  const processTestDataDropOutcome = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      const outcome = resolveSingleFileDropOutcome(acceptedFiles, fileRejections);
      if (outcome.kind === 'reject') {
        const payload = getTrainingDataDropRejectedNotification(outcome.fileRejections);
        if (payload) {
          notification.error(payload.title, payload.description);
        }
      } else if (outcome.kind === 'upload') {
        void uploadTestDataFile(outcome.file);
      }
    },
    [notification, uploadTestDataFile],
  );

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
        <Split hasGutter isWrappable>
          <SplitItem style={{ width: '10rem' }} isFilled>
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
                  toggleWidth="16rem"
                  dataTestId={dataTestId}
                />
              )}
            />
          </SplitItem>
          <SplitItem>
            <Button
              key={`add-new-connection-${dataTestId}`}
              variant="secondary"
              isDisabled={formIsSubmitting}
              onClick={() => setIsConnectionModalOpen(true)}
            >
              Add new connection
            </Button>
          </SplitItem>
        </Split>
      </ConfigureFormGroup>
    </StackItem>
  );

  if (!namespace) {
    return <Navigate to={automlExperimentsPathname} replace />;
  }

  return (
    <>
      <Grid className="pf-v6-u-h-100" hasGutter>
        <GridItem span={4}>
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
                            <Content component="p">
                              The system uses 80% of your data to train the model and 20% to test
                              how well it learned.
                            </Content>
                            <Content component="p">
                              It splits data randomly for regression, keeps categories balanced for
                              classification, and uses earlier records for training and later
                              records for testing with time series data.
                            </Content>
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
                          <StackItem className="pf-v6-u-mt-sm">
                            <ToggleGroup
                              aria-label="Choose how to add training data"
                              className="automl-configure__toggle-group-full-width pf-v6-u-mb-md"
                            >
                              <ToggleGroupItem
                                text="Select file from bucket"
                                buttonId="training-data-input-select"
                                data-testid="training-data-source-select-toggle"
                                isSelected={trainingDataSourceMode === 'select'}
                                isDisabled={formIsSubmitting}
                                onChange={() => setTrainingDataSourceMode('select')}
                              />
                              <ToggleGroupItem
                                text="Upload new file"
                                buttonId="training-data-input-upload"
                                data-testid="training-data-source-upload-toggle"
                                isSelected={trainingDataSourceMode === 'upload'}
                                isDisabled={formIsSubmitting}
                                onChange={() => setTrainingDataSourceMode('upload')}
                              />
                            </ToggleGroup>
                          </StackItem>

                          {trainingDataSourceMode === 'select' && (
                            <>
                              <StackItem>
                                <Content component="h4">Select file from bucket</Content>
                              </StackItem>
                              <StackItem>
                                <Content component="small">
                                  Select one CSV file from this bucket to use as training data for
                                  your experiment.
                                </Content>
                              </StackItem>
                              <StackItem>
                                <Button
                                  key="browse-bucket"
                                  variant="secondary"
                                  data-testid="browse-bucket-button"
                                  onClick={() => {
                                    setFileExplorerTarget('train');
                                    setIsFileExplorerOpen(true);
                                  }}
                                  isDisabled={!canSelectFiles || formIsSubmitting}
                                >
                                  Browse bucket
                                </Button>
                              </StackItem>
                              {selectedTrainingDataFile && (
                                <StackItem>
                                  <Table aria-label="Selected training data file" variant="compact">
                                    <Thead>
                                      <Tr>
                                        <Th>Name</Th>
                                        <Th>Type</Th>
                                        <Th />
                                      </Tr>
                                    </Thead>
                                    <Tbody>
                                      <Tr>
                                        <Td dataLabel="Name">
                                          <span title={selectedTrainingDataFile.path}>
                                            <Truncate content={selectedTrainingDataFile.name} />
                                          </span>
                                        </Td>
                                        <Td dataLabel="Type">{selectedTrainingDataFile.type}</Td>
                                        <Td isActionCell>
                                          <Tooltip content="Remove selection">
                                            <Button
                                              size="sm"
                                              variant="plain"
                                              aria-label="Remove selection"
                                              icon={<TimesIcon />}
                                              isDisabled={formIsSubmitting}
                                              onClick={() => {
                                                setSelectedTrainingDataFile(undefined);
                                                setValue('train_data_file_key', '', {
                                                  shouldValidate: true,
                                                });
                                              }}
                                            />
                                          </Tooltip>
                                        </Td>
                                      </Tr>
                                    </Tbody>
                                  </Table>
                                </StackItem>
                              )}
                            </>
                          )}

                          {trainingDataSourceMode === 'upload' && (
                            <>
                              <StackItem>
                                <Content component="h4">Upload file</Content>
                              </StackItem>
                              <StackItem>
                                <Content component="small" id="training-data-upload-description">
                                  Drop a file here or browse to select a file.
                                </Content>
                              </StackItem>
                              <StackItem>
                                <input
                                  ref={trainingDataNativeInputRef}
                                  type="file"
                                  hidden
                                  data-testid="automl-upload-file-input"
                                  accept={TRAINING_DATA_UPLOAD_NATIVE_ACCEPT}
                                  aria-hidden
                                  tabIndex={-1}
                                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                    const input = event.currentTarget;
                                    const file = input.files?.[0];
                                    input.value = '';
                                    if (!file) {
                                      return;
                                    }
                                    void uploadTrainingDataFile(file);
                                  }}
                                />
                                {showTrainingDataUploadDropzone && (
                                  <MultipleFileUpload
                                    aria-describedby="training-data-upload-description"
                                    data-testid="training-data-upload-zone"
                                    dropzoneProps={{
                                      accept: TRAINING_DATA_FILE_ACCEPT,
                                      disabled: formIsSubmitting || isTrainingDataFileUploading,
                                      maxFiles: AUTOML_TRAINING_UPLOAD_MAX_FILES,
                                      maxSize: AUTOML_TRAINING_UPLOAD_MAX_BYTES,
                                      multiple: false,
                                      onDrop: processTrainingDataDropOutcome,
                                    }}
                                  >
                                    <MultipleFileUploadMain
                                      titleIcon={<UploadIcon />}
                                      titleText="Drag and drop files here"
                                      titleTextSeparator="or"
                                      infoText={`Accepted file types: CSV. Maximum file size: ${AUTOML_TRAINING_UPLOAD_MAX_SIZE_MIB} MiB`}
                                      browseButtonText="Upload"
                                    />
                                  </MultipleFileUpload>
                                )}
                                {!showTrainingDataUploadDropzone && (
                                  <Table
                                    aria-label="Training data file upload"
                                    borders
                                    variant="compact"
                                    className="pf-v6-u-w-100"
                                  >
                                    <Thead>
                                      <Tr>
                                        <Th>File</Th>
                                        <Th aria-label="Actions" />
                                      </Tr>
                                    </Thead>
                                    <Tbody>
                                      <Tr>
                                        <Td dataLabel="File" data-testid="uploaded-file-cell">
                                          <Split hasGutter>
                                            {isTrainingDataFileUploading && (
                                              <SplitItem>
                                                <Spinner
                                                  size="md"
                                                  aria-label="Uploading file"
                                                  data-testid="training-data-upload-spinner"
                                                />
                                              </SplitItem>
                                            )}
                                            <SplitItem isFilled>
                                              {isTrainingDataFileUploading ? (
                                                'Uploading…'
                                              ) : (
                                                <Truncate content={trainDataFileKey} />
                                              )}
                                            </SplitItem>
                                          </Split>
                                        </Td>
                                        <Td isActionCell modifier="fitContent">
                                          <Dropdown
                                            isOpen={isTrainingDataUploadDropdownOpen}
                                            onOpenChange={setIsTrainingDataUploadDropdownOpen}
                                            shouldFocusToggleOnSelect
                                            toggle={(toggleRef) => (
                                              <MenuToggle
                                                ref={toggleRef}
                                                variant="plain"
                                                aria-label="Uploaded file actions"
                                                icon={<EllipsisVIcon />}
                                                onClick={() =>
                                                  setIsTrainingDataUploadDropdownOpen(
                                                    !isTrainingDataUploadDropdownOpen,
                                                  )
                                                }
                                                isExpanded={isTrainingDataUploadDropdownOpen}
                                                isDisabled={
                                                  formIsSubmitting || isTrainingDataFileUploading
                                                }
                                              />
                                            )}
                                            popperProps={{ position: 'end', preventOverflow: true }}
                                          >
                                            <DropdownList>
                                              <DropdownItem
                                                key="remove"
                                                data-testid="training-data-upload-remove"
                                                isDisabled={formIsSubmitting}
                                                onClick={clearTrainingDataUpload}
                                              >
                                                Remove
                                              </DropdownItem>
                                              <DropdownItem
                                                key="replace"
                                                data-testid="training-data-upload-replace"
                                                isDisabled={formIsSubmitting}
                                                onClick={openTrainingDataReplaceFileDialog}
                                              >
                                                Replace
                                              </DropdownItem>
                                            </DropdownList>
                                          </Dropdown>
                                        </Td>
                                      </Tr>
                                    </Tbody>
                                  </Table>
                                )}
                              </StackItem>
                            </>
                          )}
                          {isFileSelected &&
                            !isTrainingDataFileUploading &&
                            !isLoadingColumns &&
                            !isFetchingColumns &&
                            !columnsError &&
                            !isFetchingRowCount &&
                            !rowCountError &&
                            trainingDataRowCount !== undefined &&
                            schemaColumns.length > 0 && (
                              <StackItem>
                                <HelperText aria-live="polite">
                                  <HelperTextItem
                                    variant="success"
                                    icon={<CheckCircleIcon />}
                                    data-testid="training-data-load-success"
                                  >
                                    Successfully loaded {trainingDataRowCount}{' '}
                                    {trainingDataRowCount === 1 ? 'row' : 'rows'} with{' '}
                                    {schemaColumns.length}{' '}
                                    {schemaColumns.length === 1 ? 'column' : 'columns'}
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
                                    <SplitItem isFilled>1. Training data</SplitItem>
                                    <SplitItem>
                                      <Flex alignItems={{ default: 'alignItemsCenter' }}>
                                        <FlexItem>
                                          {trainDataFileKey ? (
                                            <CheckCircleIcon color="var(--pf-t--global--icon--color--status--success--default)" />
                                          ) : (
                                            <ExclamationTriangleIcon color="var(--pf-t--global--icon--color--status--warning--default)" />
                                          )}
                                        </FlexItem>
                                        <FlexItem>
                                          {trainDataFileKey
                                            ? (selectedTrainingDataFile?.name ?? trainDataFileKey)
                                            : 'Incomplete'}
                                        </FlexItem>
                                      </Flex>
                                    </SplitItem>
                                  </Split>
                                </AccordionToggle>
                                <AccordionContent>
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
                                    <SplitItem isFilled>2. Test data</SplitItem>
                                    <SplitItem>
                                      <Flex alignItems={{ default: 'alignItemsCenter' }}>
                                        <FlexItem>
                                          {testDataFileKey ? (
                                            <CheckCircleIcon color="var(--pf-t--global--icon--color--status--success--default)" />
                                          ) : (
                                            <ExclamationTriangleIcon color="var(--pf-t--global--icon--color--status--warning--default)" />
                                          )}
                                        </FlexItem>
                                        <FlexItem>
                                          {testDataFileKey
                                            ? (selectedTestDataFile?.name ?? testDataFileKey)
                                            : 'Incomplete'}
                                        </FlexItem>
                                      </Flex>
                                    </SplitItem>
                                  </Split>
                                </AccordionToggle>
                                <AccordionContent>
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
                                      </>
                                    )}
                                  </Stack>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
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
        <GridItem span={8}>
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
                                          45-minute model-selection budget.
                                          <br />
                                          Use fewer resources to prioritize speed
                                        </>
                                      ) : preset === PRESET_BETTER_QUALITY ? (
                                        <>
                                          8 vCPU / 32 GiB
                                          <br />
                                          Up to 3 hours for model selection.
                                          <br />
                                          Use more resources to prioritize accuracy
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
        namespace={namespace}
        s3SecretName={selectedSecret?.name}
        isOpen={isFileExplorerOpen}
        onClose={() => setIsFileExplorerOpen(false)}
        onSelectFiles={(files) => {
          if (files.length > 0) {
            const file = files[0];
            const filePath = file.path.replace(/^\//, '');
            if (fileExplorerTarget === 'test') {
              setValue('test_data_file_key', filePath, { shouldValidate: true });
              setSelectedTestDataFile(file);
            } else {
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
