import { Connection } from '@odh-dashboard/internal/concepts/connectionTypes/types';
import {
  isConnectionType,
  isConnectionTypeDataField,
  S3ConnectionTypeKeys,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import { useWatchConnectionTypes } from '@odh-dashboard/internal/utilities/useWatchConnectionTypes';
import {
  Alert,
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
  FormHelperText,
  Gallery,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  MenuToggle,
  MultipleFileUpload,
  MultipleFileUploadMain,
  NumberInput,
  Split,
  SplitItem,
  Spinner,
  Stack,
  StackItem,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  Truncate,
  type DropEvent,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { CubesIcon, EllipsisVIcon, TimesIcon, UploadIcon } from '@patternfly/react-icons';
import { useQueryClient } from '@tanstack/react-query';
import { findKey } from 'es-toolkit';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Navigate, useParams } from 'react-router';
import AutomlConnectionModal from '~/app/components/common/AutomlConnectionModal';
import ConfigureFormGroup from '~/app/components/common/ConfigureFormGroup';
import S3FileExplorer from '~/app/components/common/S3FileExplorer/S3FileExplorer.tsx';
import type { File as S3ExplorerFile } from '~/app/components/common/FileExplorer/FileExplorer.tsx';
import SecretSelector, { SecretSelection } from '~/app/components/common/SecretSelector';
import useReconfigureSafeEffect from '~/app/hooks/useReconfigureSafeEffect';
import { useS3FileUploadMutation } from '~/app/hooks/mutations';
import { useS3GetFileSchemaQuery } from '~/app/hooks/queries';
import { useNotification } from '~/app/hooks/useNotification';
import {
  ConfigureSchema,
  MAX_TOP_N_TABULAR,
  MAX_TOP_N_TIMESERIES,
  MIN_TOP_N,
  TASK_TYPES,
} from '~/app/schemas/configure.schema';
import { SecretListItem } from '~/app/types';
import {
  TASK_TYPE_BINARY,
  TASK_TYPE_LABELS,
  TASK_TYPE_MULTICLASS,
  TASK_TYPE_REGRESSION,
  TASK_TYPE_TIMESERIES,
  REQUIRED_CONNECTION_SECRET_KEYS,
} from '~/app/utilities/const';
import { automlExperimentsPathname } from '~/app/utilities/routes';
import { getMissingRequiredKeys } from '~/app/utilities/secretValidation';
import ConfigureTabularForm from './ConfigureTabularForm';
import ConfigureTimeseriesForm from './ConfigureTimeseriesForm';
import './AutomlConfigure.scss';

const PREDICTION_TYPES: {
  value: ConfigureSchema['task_type'];
  label: string;
  description: string;
}[] = [
  {
    value: TASK_TYPE_BINARY,
    label: TASK_TYPE_LABELS[TASK_TYPE_BINARY],
    description:
      'Classify data into categories. Choose this if your prediction column contains two distinct categories',
  },
  {
    value: TASK_TYPE_MULTICLASS,
    label: TASK_TYPE_LABELS[TASK_TYPE_MULTICLASS],
    description:
      'Classify data into categories. Choose this if your prediction column contains multiple distinct categories',
  },
  {
    value: TASK_TYPE_REGRESSION,
    label: TASK_TYPE_LABELS[TASK_TYPE_REGRESSION],
    description:
      'Predict values from a continuous set of values. Choose this if your prediction column contains a large number of values',
  },
  {
    value: TASK_TYPE_TIMESERIES,
    label: TASK_TYPE_LABELS[TASK_TYPE_TIMESERIES],
    description:
      'Predict future activity over a specified date/time range. Data must be structured and sequential.',
  },
];

/** MIME types and extensions for the training CSV upload dropzone (react-dropzone `accept` format). */
const TRAINING_DATA_FILE_ACCEPT: Record<string, string[]> = {
  'text/csv': ['.csv'],
};

const TRAINING_DATA_UPLOAD_NATIVE_ACCEPT = [
  ...new Set(Object.values(TRAINING_DATA_FILE_ACCEPT).flat()),
].join(',');

/** Matches MultipleFileUpload dropzone `maxSize` (32 MiB). */
const TRAINING_DATA_UPLOAD_MAX_BYTES = 32 * 1024 * 1024;

/** Same allowlist as the dropzone `accept` map (extension and/or MIME). */
function isAllowedTrainingDataUploadFile(file: File): boolean {
  const dot = file.name.lastIndexOf('.');
  const ext = dot === -1 ? '' : file.name.slice(dot).toLowerCase();
  if (ext) {
    for (const allowed of Object.values(TRAINING_DATA_FILE_ACCEPT).flat()) {
      if (allowed.toLowerCase() === ext) {
        return true;
      }
    }
  }
  return Boolean(file.type && file.type in TRAINING_DATA_FILE_ACCEPT);
}

type AutomlConfigureProps = {
  initialValues?: Partial<ConfigureSchema>;
  initialInputDataSecret?: SecretSelection;
};

function AutomlConfigure({
  initialValues,
  initialInputDataSecret,
}: AutomlConfigureProps): React.JSX.Element {
  const { namespace } = useParams();
  const queryClient = useQueryClient();
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
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [newConnectionNotLoaded, setNewConnectionNotLoaded] = useState(false);
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState<boolean>(false);
  const initialFileKey = initialValues?.train_data_file_key;

  const [selectedSecret, setSelectedSecret] = useState<SecretSelection | undefined>(
    initialInputDataSecret,
  );
  const [trainingDataSourceMode, setTrainingDataSourceMode] = useState<'select' | 'upload'>(
    'select',
  );
  const [selectedTrainingDataFile, setSelectedTrainingDataFile] = useState<
    S3ExplorerFile | undefined
  >(() => {
    if (!initialFileKey) {
      return undefined;
    }
    const lastSegment = initialFileKey.split('/').pop();
    const fileName = lastSegment || initialFileKey;
    const ext = fileName && fileName.includes('.') ? fileName.split('.').pop()! : '';
    return { name: fileName, path: `/${initialFileKey}`, type: ext };
  });
  const [isTrainingDataFileUploading, setIsTrainingDataFileUploading] = useState(false);
  const [isTrainingDataUploadDropdownOpen, setIsTrainingDataUploadDropdownOpen] = useState(false);
  const trainingDataUploadSeqRef = useRef(0);
  const trainingDataNativeInputRef = useRef<HTMLInputElement>(null);
  const secretsRefreshRef = useRef<(() => Promise<SecretListItem[] | undefined>) | null>(null);
  // Initialized from initialFileKey so the file-change effect treats the pre-populated
  // value as the baseline in reconfigure flows, preventing an unnecessary reset on mount.
  const previousFileKeyRef = useRef<string | undefined>(initialFileKey);

  const notification = useNotification();

  const { mutateAsync: uploadFileToS3 } = useS3FileUploadMutation('');

  const form = useFormContext<ConfigureSchema>();

  const {
    control,
    setValue,
    getValues,
    trigger,
    formState: { isSubmitting: formIsSubmitting },
  } = form;

  const [trainDataSecretName, trainDataBucketName, trainDataFileKey, taskType] = useWatch({
    control: form.control,
    name: ['train_data_secret_name', 'train_data_bucket_name', 'train_data_file_key', 'task_type'],
  });
  const isTaskTypeSelected = TASK_TYPES.includes(taskType);
  const isTimeseries = taskType === TASK_TYPE_TIMESERIES;

  // Calculate max top_n based on task type
  const maxTopN = isTimeseries ? MAX_TOP_N_TIMESERIES : MAX_TOP_N_TABULAR;

  // Re-validate top_n when task type changes (max depends on task type)
  useEffect(() => {
    if (isTaskTypeSelected) {
      void trigger('top_n');
    }
  }, [taskType, isTaskTypeSelected, trigger]);

  const canSelectFiles = !selectedSecret?.invalid && Boolean(trainDataSecretName);
  const isFileSelected = Boolean(trainDataFileKey);
  const showTrainingDataUploadDropzone = !isTrainingDataFileUploading && !trainDataFileKey.trim();

  const canSelectLearningType = isFileSelected;
  // && Boolean(watch('train_data_bucket_name')); // Add condition when we have bucket selection

  const {
    data: columns = [],
    isLoading: isLoadingColumns,
    isFetching: isFetchingColumns,
    error: columnsError,
  } = useS3GetFileSchemaQuery(
    namespace ?? '',
    trainDataSecretName,
    trainDataBucketName,
    trainDataFileKey,
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
    setIsTrainingDataFileUploading(false);
    setValue('train_data_file_key', '', { shouldValidate: true });
    setSelectedTrainingDataFile(undefined);
  }, [trainDataSecretName, trainDataBucketName, setValue]);

  // reset training data key when select vs upload mode changes (skips mount to preserve reconfigure)
  useReconfigureSafeEffect(() => {
    trainingDataUploadSeqRef.current += 1;
    setIsTrainingDataFileUploading(false);
    setValue('train_data_file_key', '', { shouldValidate: true });
    setSelectedTrainingDataFile(undefined);
  }, [trainingDataSourceMode, setValue]);

  // reset prediction type and column-related form fields when file selection changes
  useEffect(() => {
    const fileChangedOrRemoved =
      (trainDataFileKey && trainDataFileKey !== previousFileKeyRef.current) ||
      (!trainDataFileKey && previousFileKeyRef.current);
    if (fileChangedOrRemoved) {
      // Reset task type form fields
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- intentionally invalid value to clear selection
      setValue('task_type', '' as never, { shouldValidate: true });

      // Reset tabular form fields
      setValue('label_column', '', { shouldValidate: true });

      // Reset timeseries form fields
      setValue('target', '', { shouldValidate: true });
      setValue('timestamp_column', '', { shouldValidate: true });
      setValue('id_column', '', { shouldValidate: true });
      setValue('known_covariates_names', [], { shouldValidate: true });
      setValue('prediction_length', undefined, { shouldValidate: true });
    }
    previousFileKeyRef.current = trainDataFileKey;
  }, [trainDataFileKey, setValue]);

  // reset columns query cache and label column when connection data is cleared
  useEffect(() => {
    if (!namespace) {
      return;
    }
    if (!trainDataSecretName || !trainDataBucketName || !trainDataFileKey) {
      queryClient.setQueryData(
        ['files', namespace, trainDataSecretName, trainDataBucketName, trainDataFileKey],
        [],
      );
      setValue('label_column', '', { shouldValidate: true });
    }
  }, [
    trainDataSecretName,
    trainDataBucketName,
    trainDataFileKey,
    namespace,
    queryClient,
    setValue,
  ]);

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
      if (file.size > TRAINING_DATA_UPLOAD_MAX_BYTES) {
        notification.error('File too large', 'File size must be 32 MiB or less.');
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
    [namespace, notification, setValue, trainDataBucketName, trainDataSecretName, uploadFileToS3],
  );

  const openTrainingDataReplaceFileDialog = useCallback(() => {
    setIsTrainingDataUploadDropdownOpen(false);
    trainingDataNativeInputRef.current?.click();
  }, []);

  if (!namespace) {
    return <Navigate to={automlExperimentsPathname} replace />;
  }

  return (
    <>
      <Grid className="pf-v6-u-h-100" hasGutter>
        <GridItem span={4}>
          <Card className="pf-v6-u-p-xs" isFullHeight>
            <div style={{ overflow: 'auto' }}>
              <CardHeader>
                <Content component="h3">Documents</Content>
                <Content component="p">
                  Select or upload documents to train and build machine learning models for tabular
                  or timeseries data.
                </Content>
              </CardHeader>
              <CardBody>
                <Stack hasGutter>
                  <StackItem>
                    <ConfigureFormGroup
                      label="S3 connection"
                      description="Select the S3 connection that contains your desired documents, or add a new connection."
                    >
                      <Split hasGutter isWrappable>
                        <SplitItem style={{ width: '10rem' }} isFilled>
                          {Boolean(namespace) && (
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

                                    const requiredKeys =
                                      REQUIRED_CONNECTION_SECRET_KEYS[secret.type ?? ''];
                                    const invalid = requiredKeys
                                      ? getMissingRequiredKeys(
                                          requiredKeys,
                                          Object.keys(secret.data ?? {}),
                                        ).length > 0
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
                                  dataTestId="aws-secret-selector"
                                />
                              )}
                            />
                          )}
                        </SplitItem>
                        <SplitItem>
                          <Button
                            key="add-new-connection"
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
                  {newConnectionNotLoaded && (
                    <StackItem className="pf-v6-u-mt-md">
                      <Alert variant="warning" isInline title="Connection added">
                        The connection was created but could not be loaded. Please refresh the page
                        to see it.
                      </Alert>
                    </StackItem>
                  )}
                  {Boolean(trainDataSecretName) && (
                    <>
                      <StackItem>
                        <Divider />
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
                            text="Upload file"
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
                              Select one CSV file from this bucket to use as training data for your
                              experiment.
                            </Content>
                          </StackItem>
                          <StackItem>
                            <Button
                              key="browse-bucket"
                              variant="secondary"
                              onClick={() => setIsFileExplorerOpen(true)}
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
                                      <Truncate content={selectedTrainingDataFile.name} />
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
                                onFileDrop={(_event: DropEvent, droppedFiles: File[]) => {
                                  const [file] = droppedFiles;
                                  void uploadTrainingDataFile(file);
                                }}
                                dropzoneProps={{
                                  accept: TRAINING_DATA_FILE_ACCEPT,
                                  disabled: formIsSubmitting || isTrainingDataFileUploading,
                                  maxFiles: 1,
                                  maxSize: TRAINING_DATA_UPLOAD_MAX_BYTES,
                                  multiple: false,
                                }}
                              >
                                <MultipleFileUploadMain
                                  titleIcon={<UploadIcon />}
                                  titleText="Drag and drop files here"
                                  titleTextSeparator="or"
                                  infoText="Accepted file types: CSV. Maximum file size: 32 MiB"
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
                                    <Td dataLabel="File">
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
                {!trainDataFileKey ? (
                  <EmptyState
                    variant="xs"
                    titleText="Select an S3 connection or upload a file to get started"
                    headingLevel="h4"
                    icon={CubesIcon}
                  >
                    <EmptyStateBody>
                      In order to configure details and run an experiment, add a document or
                      connection in the widget on the left.
                    </EmptyStateBody>
                  </EmptyState>
                ) : (
                  <Stack hasGutter style={{ gap: 'var(--pf-t--global--spacer--xl)' }}>
                    <StackItem>
                      <ConfigureFormGroup label="Prediction type" isRequired>
                        <Controller
                          control={form.control}
                          name="task_type"
                          render={({ field }) => (
                            <Gallery hasGutter minWidths={{ default: '200px' }}>
                              {PREDICTION_TYPES.map((type) => (
                                <Card
                                  key={type.value}
                                  isSelectable
                                  isDisabled={!canSelectLearningType || formIsSubmitting}
                                  isSelected={field.value === type.value}
                                  data-testid={`task-type-card-${type.value}`}
                                >
                                  <CardHeader
                                    selectableActions={{
                                      selectableActionId: `task-type-${type.value}`,
                                      selectableActionAriaLabelledby: `task-type-label-${type.value}`,
                                      name: 'task_type',
                                      variant: 'single',
                                      isChecked: field.value === type.value,
                                      onChange: () => field.onChange(type.value),
                                      isHidden: true,
                                    }}
                                  >
                                    <CardTitle id={`task-type-label-${type.value}`}>
                                      {type.label}
                                    </CardTitle>
                                  </CardHeader>
                                  <CardBody>
                                    <Content component="small">{type.description}</Content>
                                  </CardBody>
                                </Card>
                              ))}
                            </Gallery>
                          )}
                        />
                      </ConfigureFormGroup>
                    </StackItem>

                    {isTaskTypeSelected && isTimeseries ? (
                      <ConfigureTimeseriesForm
                        columns={columns}
                        isLoadingColumns={isLoadingColumns}
                        isFetchingColumns={isFetchingColumns}
                        columnsError={columnsError}
                        isFileSelected={isFileSelected}
                        formIsSubmitting={formIsSubmitting}
                      />
                    ) : isTaskTypeSelected ? (
                      <ConfigureTabularForm
                        columns={columns}
                        isLoadingColumns={isLoadingColumns}
                        isFetchingColumns={isFetchingColumns}
                        columnsError={columnsError}
                        isFileSelected={isFileSelected}
                        formIsSubmitting={formIsSubmitting}
                      />
                    ) : null}

                    {isTaskTypeSelected && (
                      <StackItem>
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
                  </Stack>
                )}
              </CardBody>
            </div>
          </Card>
        </GridItem>
      </Grid>

      {isConnectionModalOpen && (
        <AutomlConnectionModal
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
        />
      )}
      <S3FileExplorer
        id="AutoMLConfigure-S3FileExplorer"
        namespace={namespace}
        s3Secret={selectedSecret}
        isOpen={isFileExplorerOpen}
        onClose={() => setIsFileExplorerOpen(false)}
        onSelectFiles={(files) => {
          if (files.length > 0) {
            const file = files[0];
            const filePath = file.path.replace(/^\//, '');
            setValue('train_data_file_key', filePath, { shouldValidate: true });
            setSelectedTrainingDataFile(file);
          }
        }}
        allowFolderSelection={false}
        selectableExtensions={['csv']}
        unselectableReason="You can only select CSV files"
      />
    </>
  );
}

export default AutomlConfigure;
