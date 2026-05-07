import { Connection } from '@odh-dashboard/internal/concepts/connectionTypes/types';
import {
  isConnectionType,
  isConnectionTypeDataField,
  S3ConnectionTypeKeys,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import { useWatchConnectionTypes } from '@odh-dashboard/internal/utilities/useWatchConnectionTypes';
import {
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
  List,
  ListItem,
  MenuToggle,
  MultipleFileUpload,
  MultipleFileUploadMain,
  NumberInput,
  Popover,
  Select,
  SelectList,
  SelectOption,
  Skeleton,
  Spinner,
  Split,
  SplitItem,
  Stack,
  StackItem,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  Truncate,
  type DropEvent,
} from '@patternfly/react-core';
import {
  CubesIcon,
  EllipsisVIcon,
  InfoCircleIcon,
  TimesIcon,
  UploadIcon,
} from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { findKey } from 'es-toolkit';
import { DashboardPopupIconButton } from 'mod-arch-shared';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useFormContext, useWatch, Watch } from 'react-hook-form';
import { Navigate, useParams } from 'react-router';
import AutoragConnectionModal from '~/app/components/common/AutoragConnectionModal';
import ConfigureFormGroup from '~/app/components/common/ConfigureFormGroup';
import S3FileExplorer from '~/app/components/common/S3FileExplorer/S3FileExplorer.tsx';
import type { File as S3File } from '~/app/components/common/FileExplorer/FileExplorer.tsx';
import SecretSelector, { SecretSelection } from '~/app/components/common/SecretSelector';
import useReconfigureSafeEffect from '~/app/hooks/useReconfigureSafeEffect';
import { useS3FileUploadMutation } from '~/app/hooks/mutations';
import { useLlamaStackModelsQuery } from '~/app/hooks/queries';
import { useNotification } from '~/app/hooks/useNotification';
import {
  ConfigureSchema,
  MAX_RAG_PATTERNS,
  MIN_RAG_PATTERNS,
  RAG_METRIC_ANSWER_CORRECTNESS,
  RAG_METRIC_FAITHFULNESS,
} from '~/app/schemas/configure.schema';
import { OPTIMIZATION_METRIC_LABELS, REQUIRED_CONNECTION_SECRET_KEYS } from '~/app/utilities/const';
import { SecretListItem } from '~/app/types';
import { autoragExperimentsPathname } from '~/app/utilities/routes';
import { getMissingRequiredKeys } from '~/app/utilities/secretValidation';
import AutoragEvaluationSelect from './AutoragEvaluationSelect';
import AutoragExperimentSettings from './AutoragExperimentSettings';
import AutoragVectorStoreSelector from './AutoragVectorStoreSelector';
import EvaluationTemplateModal from './EvaluationTemplateModal';
import './AutoragConfigure.scss';

/** MIME types and extensions for the knowledge document upload dropzone (react-dropzone `accept` format). */
const INPUT_DATA_FILE_ACCEPT: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'text/markdown': ['.md', '.markdown'],
  'text/html': ['.html', '.htm'],
  'text/plain': ['.txt'],
};

const INPUT_DATA_UPLOAD_NATIVE_ACCEPT = [
  ...new Set(Object.values(INPUT_DATA_FILE_ACCEPT).flat()),
].join(',');

/** Matches MultipleFileUpload dropzone `maxSize` (32 MiB). */
const INPUT_DATA_UPLOAD_MAX_BYTES = 32 * 1024 * 1024;

/** Same allowlist as the dropzone `accept` map (extension and/or MIME). */
function isAllowedInputDataUploadFile(file: File): boolean {
  const dot = file.name.lastIndexOf('.');
  const ext = dot === -1 ? '' : file.name.slice(dot).toLowerCase();
  if (ext) {
    for (const allowed of Object.values(INPUT_DATA_FILE_ACCEPT).flat()) {
      if (allowed.toLowerCase() === ext) {
        return true;
      }
    }
  }
  return Boolean(file.type && file.type in INPUT_DATA_FILE_ACCEPT);
}

const OPTIMIZATION_METRICS: {
  value: ConfigureSchema['optimization_metric'];
  label: string;
  description: string;
}[] = [
  {
    value: RAG_METRIC_FAITHFULNESS,
    label: OPTIMIZATION_METRIC_LABELS[RAG_METRIC_FAITHFULNESS],
    description: 'How factually grounded the answer is in the retrieved context.',
  },
  {
    value: RAG_METRIC_ANSWER_CORRECTNESS,
    label: OPTIMIZATION_METRIC_LABELS[RAG_METRIC_ANSWER_CORRECTNESS],
    description: 'How correct the generated answer is compared to the ground truth.',
  },
];

type AutoragConfigureProps = {
  initialValues?: Partial<ConfigureSchema>;
  initialInputDataSecret?: SecretSelection;
};

function AutoragConfigure({
  initialValues,
  initialInputDataSecret,
}: AutoragConfigureProps): React.JSX.Element {
  const { namespace } = useParams();
  const [allConnectionTypes] = useWatchConnectionTypes();
  const autoragConnectionTypes = React.useMemo(
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
  const [isConnectionModalOpen, setIsConnectionModalOpen] = React.useState(false);

  const [fileExplorerMode, setFileExplorerMode] = useState<false | 'input_data' | 'test_data'>(
    false,
  );

  const [isExperimentSettingsOpen, setIsExperimentSettingsOpen] = useState<boolean>(false);
  const [isMetricSelectOpen, setIsMetricSelectOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const initialInputDataKey = initialValues?.input_data_key;

  const [selectedSecret, setSelectedSecret] = useState<SecretSelection | undefined>(
    initialInputDataSecret,
  );
  const [inputDataSourceMode, setInputDataSourceMode] = useState<'select' | 'upload'>('select');
  const [selectedInputDataFile, setSelectedInputDataFile] = useState<S3File | undefined>(() => {
    if (!initialInputDataKey) {
      return undefined;
    }
    const lastSegment = initialInputDataKey.split('/').pop();
    const fileName = lastSegment || initialInputDataKey;
    const ext = fileName && fileName.includes('.') ? fileName.split('.').pop()! : '';
    return { name: fileName, path: `/${initialInputDataKey}`, type: ext };
  });
  const [isInputDataFileUploading, setIsInputDataFileUploading] = useState(false);
  const [isInputDataDropdownOpen, setIsInputDataDropdownOpen] = useState(false);
  const inputDataUploadSeqRef = useRef(0);
  const inputDataNativeInputRef = useRef<HTMLInputElement>(null);
  const secretsRefreshRef = useRef<(() => Promise<SecretListItem[] | undefined>) | null>(null);
  const modelsInitialized = useRef(false);

  const notification = useNotification();

  const form = useFormContext<ConfigureSchema>();
  const { getValues, reset, setValue, formState } = form;
  const { isSubmitting } = formState;

  const [
    llamaStackSecretName,
    inputDataSecretName,
    inputDataBucketName,
    testDataSecretName,
    testDataBucketName,
    inputDataKey,
  ] = useWatch({
    control: form.control,
    name: [
      'llama_stack_secret_name',
      'input_data_secret_name',
      'input_data_bucket_name',
      'test_data_secret_name',
      'test_data_bucket_name',
      'input_data_key',
    ],
  });

  const showInputDataUploadDropzone = !isInputDataFileUploading && !inputDataKey.trim();

  const {
    data: allModelsData,
    isError: isModelsError,
    isLoading: isModelsLoading,
  } = useLlamaStackModelsQuery(namespace ?? '', llamaStackSecretName);
  const { mutateAsync: uploadFileToS3 } = useS3FileUploadMutation('');

  useEffect(() => {
    if (isModelsError) {
      notification.error(
        'Failed to load models',
        'Check that the LlamaStack secret is valid and try again.',
      );
    }
  }, [isModelsError, notification]);

  // When the secret changes, mark models as needing re-initialization and
  // immediately clear stale selections so the UI reflects the transition.
  useEffect(() => {
    modelsInitialized.current = false;
    setValue('generation_models', []);
    setValue('embeddings_models', []);
  }, [llamaStackSecretName, setValue]);

  useEffect(() => {
    // Initialize available generation and embedding models into the form data
    if (allModelsData?.models && !modelsInitialized.current && !isModelsError) {
      modelsInitialized.current = true;
      reset({
        ...getValues(),
        // eslint-disable-next-line camelcase
        generation_models: allModelsData.models
          .filter((model) => model.type === 'llm')
          .map((model) => model.id)
          .toSorted((a, b) => a.localeCompare(b)),
        // eslint-disable-next-line camelcase
        embeddings_models: allModelsData.models
          .filter((model) => model.type === 'embedding')
          .map((model) => model.id)
          .toSorted((a, b) => a.localeCompare(b)),
      });
    }
  }, [allModelsData, isModelsError, getValues, reset]);

  // Sync bucket from the resolved secret object (skips mount to preserve pre-populated values in reconfigure)
  useReconfigureSafeEffect(() => {
    // Clear bucket when the secret object is deselected
    if (!selectedSecret) {
      setValue('input_data_bucket_name', '', { shouldValidate: true });
      return;
    }

    const secretData = selectedSecret.data ?? {};
    const bucketKey = findKey(secretData, (value, key) => key === 'AWS_S3_BUCKET');
    setValue('input_data_bucket_name', bucketKey ? secretData[bucketKey] : '', {
      shouldValidate: true,
    });
  }, [selectedSecret, setValue]);

  // Clear bucket when the form-level secret name is reset (e.g. user clears the dropdown)
  useEffect(() => {
    if (inputDataSecretName === '') {
      setValue('input_data_bucket_name', '', { shouldValidate: true });
    }
  }, [inputDataSecretName, setValue]);

  // reset input data key if document input mode changes (skips mount to preserve reconfigure)
  useReconfigureSafeEffect(() => {
    inputDataUploadSeqRef.current += 1;
    setIsInputDataFileUploading(false);
    setValue('input_data_key', '', { shouldValidate: true });
    setSelectedInputDataFile(undefined);
  }, [inputDataSourceMode, setValue]);

  // ensure input and test have the same secret and bucket (skips mount to preserve reconfigure)
  useReconfigureSafeEffect(() => {
    if (inputDataSecretName !== testDataSecretName) {
      setValue('test_data_secret_name', inputDataSecretName, { shouldValidate: true });
    }
    if (inputDataBucketName !== testDataBucketName) {
      setValue('test_data_bucket_name', inputDataBucketName, { shouldValidate: true });
    }
  }, [inputDataBucketName, inputDataSecretName, setValue, testDataBucketName, testDataSecretName]);

  // reset selected file values if input secret or bucket changes (skips mount to preserve reconfigure)
  useReconfigureSafeEffect(() => {
    inputDataUploadSeqRef.current += 1;
    setIsInputDataFileUploading(false);
    setValue('input_data_key', '', { shouldValidate: true });
    setSelectedInputDataFile(undefined);
  }, [inputDataSecretName, inputDataBucketName, setValue]);

  // reset selected file values if test secret or bucket changes (skips mount to preserve reconfigure)
  useReconfigureSafeEffect(() => {
    setValue('test_data_key', '', { shouldValidate: true });
  }, [testDataSecretName, testDataBucketName, setValue]);

  const openExperimentSettings = () => {
    // Snapshot current form values as the "default" so reset() can revert to them
    reset({ ...getValues() });
    setIsExperimentSettingsOpen(true);
  };

  const clearInputDataUpload = useCallback(() => {
    setIsInputDataFileUploading(false);
    setIsInputDataDropdownOpen(false);
    setValue('input_data_key', '', { shouldValidate: true });
  }, [setValue]);

  const uploadInputDataFile = useCallback(
    async (file?: File) => {
      if (!file || !namespace) {
        return;
      }
      if (file.size > INPUT_DATA_UPLOAD_MAX_BYTES) {
        notification.error('File too large', 'File size must be 32 MiB or less.');
        return;
      }
      if (!isAllowedInputDataUploadFile(file)) {
        notification.error(
          'Invalid file type',
          'File type must be one of the accepted types (PDF, DOCX, PPTX, Markdown, HTML, Plain text).',
        );
        return;
      }
      const uploadRequestId = ++inputDataUploadSeqRef.current;
      setValue('input_data_key', '', { shouldValidate: true });
      setIsInputDataDropdownOpen(false);
      setIsInputDataFileUploading(true);
      try {
        const uploadResult = await uploadFileToS3({
          namespace,
          secretName: inputDataSecretName,
          bucket: inputDataBucketName,
          key: file.name,
          file,
        });
        if (uploadRequestId !== inputDataUploadSeqRef.current) {
          return;
        }
        setValue('input_data_key', uploadResult.key, { shouldValidate: true });
      } catch (err) {
        if (uploadRequestId === inputDataUploadSeqRef.current) {
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
        if (uploadRequestId === inputDataUploadSeqRef.current) {
          setIsInputDataFileUploading(false);
        }
      }
    },
    [inputDataBucketName, inputDataSecretName, namespace, notification, setValue, uploadFileToS3],
  );

  const openInputDataReplaceFileDialog = useCallback(() => {
    setIsInputDataDropdownOpen(false);
    inputDataNativeInputRef.current?.click();
  }, []);

  if (!namespace) {
    return <Navigate to={autoragExperimentsPathname} replace />;
  }

  return (
    <>
      <Grid className="pf-v6-u-h-100" hasGutter>
        <GridItem span={4}>
          <Card className="pf-v6-u-p-xs" isFullHeight>
            <div style={{ overflow: 'auto' }}>
              <CardHeader>
                <Content component="h3">Knowledge setup</Content>
                <Content component="p">
                  Select or upload documents to serve as the source of truth for retrieval, and
                  determine how they should be indexed.
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
                              control={form.control}
                              name="input_data_secret_name"
                              render={({ field: { onChange } }) => (
                                <SecretSelector
                                  namespace={String(namespace)}
                                  type="storage"
                                  additionalRequiredKeys={REQUIRED_CONNECTION_SECRET_KEYS}
                                  isDisabled={isSubmitting}
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
                            variant="tertiary"
                            isDisabled={isSubmitting}
                            onClick={() => setIsConnectionModalOpen(true)}
                          >
                            Add new connection
                          </Button>
                        </SplitItem>
                      </Split>
                    </ConfigureFormGroup>
                  </StackItem>
                  {Boolean(inputDataSecretName) && (
                    <>
                      <StackItem>
                        <Divider />
                      </StackItem>
                      <StackItem className="pf-v6-u-mt-sm">
                        <ToggleGroup
                          aria-label="Choose how to add documents"
                          className="autorag-configure__toggle-group-full-width pf-v6-u-mb-md"
                        >
                          <ToggleGroupItem
                            text="Select file or folder"
                            buttonId="document-input-select"
                            isSelected={inputDataSourceMode === 'select'}
                            isDisabled={isSubmitting}
                            onChange={() => setInputDataSourceMode('select')}
                          />
                          <ToggleGroupItem
                            text="Upload file"
                            buttonId="document-input-upload"
                            isSelected={inputDataSourceMode === 'upload'}
                            isDisabled={isSubmitting}
                            onChange={() => setInputDataSourceMode('upload')}
                          />
                        </ToggleGroup>
                      </StackItem>

                      {inputDataSourceMode === 'select' && (
                        <>
                          <StackItem>
                            <Content component="h4">Select file or folder</Content>
                          </StackItem>
                          <StackItem>
                            <Content component="small">
                              Select one file or folder from this bucket to use as the knowledge for
                              your experiment.
                            </Content>
                          </StackItem>
                          <StackItem>
                            <Button
                              key="select-files"
                              variant="secondary"
                              onClick={() => setFileExplorerMode('input_data')}
                              isDisabled={!selectedSecret || selectedSecret.invalid || isSubmitting}
                            >
                              Browse bucket
                            </Button>
                          </StackItem>
                          {selectedInputDataFile && (
                            <StackItem>
                              <Table aria-label="Selected input data file" variant="compact">
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
                                      <Truncate content={selectedInputDataFile.name} />
                                    </Td>
                                    <Td dataLabel="Type">{selectedInputDataFile.type}</Td>
                                    <Td isActionCell>
                                      <Tooltip content="Remove selection">
                                        <Button
                                          size="sm"
                                          variant="plain"
                                          aria-label="Remove selection"
                                          icon={<TimesIcon />}
                                          isDisabled={isSubmitting}
                                          onClick={() => {
                                            setSelectedInputDataFile(undefined);
                                            setValue('input_data_key', '', {
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

                      {inputDataSourceMode === 'upload' && (
                        <>
                          <StackItem>
                            <Content component="h4">Upload file</Content>
                          </StackItem>
                          <StackItem>
                            <Content component="small" id="input-data-upload-description">
                              Drop a file here or browse to select a file.
                            </Content>
                          </StackItem>
                          <StackItem>
                            <input
                              ref={inputDataNativeInputRef}
                              type="file"
                              hidden
                              accept={INPUT_DATA_UPLOAD_NATIVE_ACCEPT}
                              aria-hidden
                              tabIndex={-1}
                              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                const input = event.currentTarget;
                                const file = input.files?.[0];
                                input.value = '';
                                if (!file) {
                                  return;
                                }
                                void uploadInputDataFile(file);
                              }}
                            />
                            {showInputDataUploadDropzone && (
                              <MultipleFileUpload
                                aria-describedby="input-data-upload-description"
                                onFileDrop={(_event: DropEvent, droppedFiles: File[]) => {
                                  const [file] = droppedFiles;
                                  void uploadInputDataFile(file);
                                }}
                                dropzoneProps={{
                                  accept: INPUT_DATA_FILE_ACCEPT,
                                  disabled: isSubmitting || isInputDataFileUploading,
                                  maxFiles: 1,
                                  maxSize: INPUT_DATA_UPLOAD_MAX_BYTES,
                                  multiple: false,
                                }}
                              >
                                <MultipleFileUploadMain
                                  titleIcon={<UploadIcon />}
                                  titleText="Drag and drop files here"
                                  titleTextSeparator="or"
                                  infoText="Accepted file types: PDF, DOCX, PPTX, Markdown, HTML, Plain text. Maximum file size: 32 MiB"
                                  browseButtonText="Upload"
                                />
                              </MultipleFileUpload>
                            )}
                            {!showInputDataUploadDropzone && (
                              <Table
                                aria-label="Knowledge document upload"
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
                                        {isInputDataFileUploading && (
                                          <SplitItem>
                                            <Spinner
                                              size="md"
                                              aria-label="Uploading file"
                                              data-testid="input-data-upload-spinner"
                                            />
                                          </SplitItem>
                                        )}
                                        <SplitItem isFilled>
                                          {isInputDataFileUploading ? (
                                            'Uploading…'
                                          ) : (
                                            <Truncate content={inputDataKey} />
                                          )}
                                        </SplitItem>
                                      </Split>
                                    </Td>
                                    <Td isActionCell modifier="fitContent">
                                      <Dropdown
                                        isOpen={isInputDataDropdownOpen}
                                        onOpenChange={setIsInputDataDropdownOpen}
                                        shouldFocusToggleOnSelect
                                        toggle={(toggleRef) => (
                                          <MenuToggle
                                            ref={toggleRef}
                                            variant="plain"
                                            aria-label="Uploaded file actions"
                                            icon={<EllipsisVIcon />}
                                            onClick={() =>
                                              setIsInputDataDropdownOpen(!isInputDataDropdownOpen)
                                            }
                                            isExpanded={isInputDataDropdownOpen}
                                            isDisabled={isSubmitting || isInputDataFileUploading}
                                          />
                                        )}
                                        popperProps={{ position: 'end', preventOverflow: true }}
                                      >
                                        <DropdownList>
                                          <DropdownItem
                                            key="remove"
                                            isDisabled={isSubmitting}
                                            onClick={clearInputDataUpload}
                                          >
                                            Remove
                                          </DropdownItem>
                                          <DropdownItem
                                            key="replace"
                                            isDisabled={isSubmitting}
                                            onClick={openInputDataReplaceFileDialog}
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
                {!inputDataKey ? (
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
                  <Flex direction={{ default: 'column' }} gap={{ default: 'gapXl' }}>
                    <FlexItem>
                      <ConfigureFormGroup
                        label="Vector I/O provider"
                        description="Specify the location for storing the vector index used to retrieve your documents."
                      >
                        <AutoragVectorStoreSelector />
                      </ConfigureFormGroup>
                    </FlexItem>

                    <FlexItem>
                      <ConfigureFormGroup
                        label="Evaluation dataset"
                        description={
                          <>
                            <span>
                              Select the evaluation dataset that will be used to measure the quality
                              of the generated responses. Must adhere to the{' '}
                            </span>
                            <Button
                              variant="link"
                              isInline
                              onClick={() => setIsTemplateModalOpen(true)}
                            >
                              evaluation dataset template
                            </Button>
                            <span>.</span>
                          </>
                        }
                      >
                        <AutoragEvaluationSelect />
                      </ConfigureFormGroup>
                    </FlexItem>

                    <FlexItem>
                      <ConfigureFormGroup
                        label="Optimization metric"
                        labelHelp={{
                          header: 'Optimization metric',
                          position: 'bottom',
                          body: (
                            <Stack hasGutter>
                              {OPTIMIZATION_METRICS.map((metric) => (
                                <StackItem key={metric.value}>
                                  <Content component="p">
                                    <strong>{metric.label}:</strong>
                                    <br />
                                    {metric.description}
                                  </Content>
                                </StackItem>
                              ))}
                            </Stack>
                          ),
                        }}
                        description="The metric used to compare configurations and identify the best result."
                      >
                        <Controller
                          control={form.control}
                          name="optimization_metric"
                          render={({ field }) => {
                            const selected = OPTIMIZATION_METRICS.find(
                              (m) => m.value === field.value,
                            );
                            return (
                              <Select
                                isOpen={isMetricSelectOpen}
                                selected={field.value}
                                onSelect={(_e, val) => {
                                  if (typeof val === 'string') {
                                    field.onChange(val);
                                  }
                                  setIsMetricSelectOpen(false);
                                }}
                                onOpenChange={setIsMetricSelectOpen}
                                toggle={(toggleRef) => (
                                  <MenuToggle
                                    ref={toggleRef}
                                    onClick={() => setIsMetricSelectOpen((prev) => !prev)}
                                    isExpanded={isMetricSelectOpen}
                                    isDisabled={isSubmitting}
                                    data-testid="optimization-metric-select"
                                  >
                                    {selected?.label ?? ''}
                                  </MenuToggle>
                                )}
                                shouldFocusToggleOnSelect
                                data-testid="optimization-metric-select-list"
                              >
                                <SelectList>
                                  {OPTIMIZATION_METRICS.map((metric) => (
                                    <SelectOption
                                      key={metric.value}
                                      value={metric.value}
                                      data-testid={`metric-option-${metric.value}`}
                                    >
                                      {metric.label}
                                    </SelectOption>
                                  ))}
                                </SelectList>
                              </Select>
                            );
                          }}
                        />
                      </ConfigureFormGroup>
                    </FlexItem>

                    <FlexItem>
                      <ConfigureFormGroup
                        label="Maximum RAG patterns"
                        description="Specify the maximum number of RAG patterns to evaluate."
                      >
                        <Controller
                          control={form.control}
                          name="optimization_max_rag_patterns"
                          render={({ field, fieldState }) => (
                            <>
                              <NumberInput
                                id="max-rag-patterns"
                                aria-label="Maximum RAG patterns"
                                value={field.value}
                                min={MIN_RAG_PATTERNS}
                                max={MAX_RAG_PATTERNS}
                                isDisabled={isSubmitting}
                                validated={fieldState.error ? 'error' : 'default'}
                                onMinus={() => field.onChange(field.value - 1)}
                                onPlus={() => field.onChange(field.value + 1)}
                                onChange={(event: React.FormEvent<HTMLInputElement>) => {
                                  const val = parseInt(event.currentTarget.value, 10);
                                  if (!Number.isNaN(val)) {
                                    field.onChange(val);
                                  }
                                }}
                                data-testid="max-rag-patterns-input"
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
                    </FlexItem>

                    <FlexItem>
                      <ConfigureFormGroup
                        label="Model configuration"
                        description="Select models to determine how documents are retrieved and which models generate responses."
                      >
                        <Card>
                          <CardHeader
                            hasWrap
                            actions={{
                              actions: [
                                <Watch
                                  key="edit-experiment-settings"
                                  control={form.control}
                                  name="input_data_key"
                                  render={(inputDataKeyValue) => (
                                    <Button
                                      variant="secondary"
                                      onClick={openExperimentSettings}
                                      isDisabled={
                                        !inputDataBucketName ||
                                        !inputDataKeyValue ||
                                        form.formState.isSubmitting ||
                                        isModelsLoading ||
                                        isModelsError ||
                                        !allModelsData?.models.length
                                      }
                                    >
                                      Edit
                                    </Button>
                                  )}
                                />,
                              ],
                            }}
                          >
                            <CardTitle>Selected models</CardTitle>
                          </CardHeader>
                          <CardBody>
                            <Stack hasGutter>
                              <StackItem>
                                {isModelsLoading ? (
                                  <Skeleton width="150px" />
                                ) : (
                                  <Watch
                                    control={form.control}
                                    name="generation_models"
                                    render={(generationModels) => (
                                      <Flex
                                        alignItems={{ default: 'alignItemsCenter' }}
                                        spacer={{ default: 'spacerNone' }}
                                        gap={{ default: 'gapSm' }}
                                      >
                                        <Content>{`${generationModels.length || 'No'} foundation models`}</Content>
                                        {!!generationModels.length && (
                                          <Popover
                                            bodyContent={
                                              <List>
                                                {generationModels.map((model) => (
                                                  <ListItem key={`generation-${model}`}>
                                                    {model}
                                                  </ListItem>
                                                ))}
                                              </List>
                                            }
                                          >
                                            <DashboardPopupIconButton
                                              icon={<InfoCircleIcon />}
                                              hasNoPadding
                                            />
                                          </Popover>
                                        )}
                                      </Flex>
                                    )}
                                  />
                                )}
                              </StackItem>
                              <StackItem>
                                {isModelsLoading ? (
                                  <Skeleton width="150px" />
                                ) : (
                                  <Watch
                                    control={form.control}
                                    name="embeddings_models"
                                    render={(embeddingModels) => (
                                      <Flex
                                        alignItems={{ default: 'alignItemsCenter' }}
                                        spacer={{ default: 'spacerNone' }}
                                        gap={{ default: 'gapSm' }}
                                      >
                                        <Content>{`${embeddingModels.length || 'No'} embedding models`}</Content>
                                        {!!embeddingModels.length && (
                                          <Popover
                                            bodyContent={
                                              <List>
                                                {embeddingModels.map((model) => (
                                                  <ListItem key={`embedding-${model}`}>
                                                    {model}
                                                  </ListItem>
                                                ))}
                                              </List>
                                            }
                                          >
                                            <DashboardPopupIconButton
                                              icon={<InfoCircleIcon />}
                                              hasNoPadding
                                            />
                                          </Popover>
                                        )}
                                      </Flex>
                                    )}
                                  />
                                )}
                              </StackItem>
                            </Stack>
                          </CardBody>
                        </Card>
                      </ConfigureFormGroup>
                    </FlexItem>
                  </Flex>
                )}
              </CardBody>
            </div>
          </Card>
        </GridItem>
      </Grid>

      {isConnectionModalOpen && (
        <AutoragConnectionModal
          connectionTypes={autoragConnectionTypes}
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
              const requiredKeys = REQUIRED_CONNECTION_SECRET_KEYS[secret.type ?? ''];
              const invalid = requiredKeys
                ? getMissingRequiredKeys(requiredKeys, Object.keys(secret.data ?? {})).length > 0
                : true;
              setSelectedSecret({ ...secret, invalid });
              setValue('input_data_secret_name', invalid ? '' : secret.name, {
                shouldValidate: true,
              });
            }
          }}
        />
      )}
      <S3FileExplorer
        id="AutoRagConfigure-S3FileExplorer"
        namespace={namespace}
        s3Secret={selectedSecret}
        isOpen={Boolean(fileExplorerMode)}
        onClose={() => setFileExplorerMode(false)}
        onSelectFiles={(files) => {
          if (files.length > 0) {
            const file = files[0];
            const filePath = file.path.replace(/^\//, '');
            if (fileExplorerMode === 'input_data') {
              setValue('input_data_key', filePath, { shouldValidate: true });
              setSelectedInputDataFile(file);
            }
            if (fileExplorerMode === 'test_data') {
              setValue('test_data_key', filePath, { shouldValidate: true });
            }
          }
        }}
        selectableExtensions={['pdf', 'docx', 'pptx', 'md', 'html', 'txt']}
        unselectableReason="You can only select PDF, DOCX, PPTX, Markdown, HTML, or Plain text files"
      />
      {isTemplateModalOpen && (
        <EvaluationTemplateModal onClose={() => setIsTemplateModalOpen(false)} />
      )}
      <AutoragExperimentSettings
        isOpen={isExperimentSettingsOpen}
        onClose={() => {
          setIsExperimentSettingsOpen(false);
        }}
        revertChanges={() => {
          reset();
        }}
      />
    </>
  );
}

export default AutoragConfigure;
