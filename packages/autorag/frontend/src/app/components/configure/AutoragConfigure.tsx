import {
  isConnectionType,
  isConnectionTypeDataField,
  S3ConnectionTypeKeys,
} from '@odh-dashboard/k8s-core';
import type { Connection } from '@odh-dashboard/k8s-core';
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
  NumberInput,
  Popover,
  Radio,
  Select,
  SelectList,
  SelectOption,
  Skeleton,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Tooltip,
  Truncate,
} from '@patternfly/react-core';
import { CubesIcon, InfoCircleIcon, TimesIcon } from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { findKey } from 'es-toolkit';
import { DashboardPopupIconButton } from 'mod-arch-shared';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useFormContext, useWatch, Watch } from 'react-hook-form';
import { Navigate, useParams } from 'react-router';
import S3FileExplorer from '@odh-dashboard/internal/concepts/fileExplorer/S3FileExplorer/S3FileExplorer';
import type { ExplorerFile } from '@odh-dashboard/internal/concepts/fileExplorer/types';
import AutoragConnectionModal from '~/app/components/common/AutoragConnectionModal';
import ConfigureFormGroup from '~/app/components/common/ConfigureFormGroup';
import SecretSelector, { SecretSelection } from '~/app/components/common/SecretSelector';
import useReconfigureSafeEffect from '~/app/hooks/useReconfigureSafeEffect';
import { useRunTriggeredTracking } from '~/app/context/RunTriggeredTrackingContext';
import { useS3FileUploadMutation } from '~/app/hooks/mutations';
import { useMaaSModelsQuery } from '~/app/hooks/queries';
import { useNotification } from '~/app/hooks/useNotification';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import {
  MAX_RAG_PATTERNS,
  MIN_RAG_PATTERNS,
  OPTIMIZATION_METRIC_LABELS,
  PRESET_BETTER_QUALITY,
  PRESET_FASTER,
  PRESET_LABELS,
  RAG_METRIC_ANSWER_CORRECTNESS,
  RAG_METRIC_FAITHFULNESS,
  RAG_METRIC_OVERALL_SCORE,
  METRIC_DESCRIPTIONS,
  REQUIRED_CONNECTION_SECRET_KEYS,
} from '~/app/utilities/const';
import type { SecretListItem } from '~/app/types';
import { autoragExperimentsPathname } from '~/app/utilities/routes';
import { getMissingRequiredKeys } from '~/app/utilities/secretValidation';
import {
  AUTORAG_UPLOAD_MAX_BYTES,
  AUTORAG_UPLOAD_MAX_FILES,
} from '~/app/utilities/dropzoneFileUpload';
import { fireAutoragKnowledgeSourceConfigured, TrackingOutcome } from '~/app/utilities/tracking';
import {
  INPUT_DATA_UPLOAD_NATIVE_ACCEPT,
  isAllowedInputDataUploadFile,
  SUPPORTED_FORMAT_EXTENSIONS,
  SUPPORTED_FORMAT_HINT,
} from '~/app/utilities/autoragInputDataFile';
import AutoragEvaluationSelect from './AutoragEvaluationSelect';
import AutoragExperimentSettings from './AutoragExperimentSettings';
import AutoragVectorStoreSelector from './AutoragVectorStoreSelector';
import EvaluationTemplateModal from './EvaluationTemplateModal';
import './AutoragConfigure.scss';

const OPTIMIZATION_METRICS: {
  value: ConfigureSchema['optimization_metric'];
  label: string;
  description: string;
}[] = [
  {
    value: RAG_METRIC_OVERALL_SCORE,
    label: OPTIMIZATION_METRIC_LABELS[RAG_METRIC_OVERALL_SCORE],
    description:
      'An equal-weight mean of all other selectable metrics, representing overall pattern performance.',
  },
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

const SYSTEM_FOLDER_DISABLED_REASON = 'This is a system folder and cannot be selected.';

const getSelectedInputDataFile = (inputDataKey: string): ExplorerFile => {
  const lastSegment = inputDataKey.split('/').pop();
  const fileName = lastSegment || inputDataKey;
  const ext = fileName && fileName.includes('.') ? fileName.split('.').pop()! : '';
  return { name: fileName, path: `/${inputDataKey}`, type: ext };
};

type AutoragConfigureProps = {
  initialValues?: Partial<ConfigureSchema> & Record<string, unknown>;
  initialInputDataSecret?: SecretSelection;
  initialVectorDbSecret?: SecretSelection;
  isReconfigure?: boolean;
  onMaaSModelsReady?: (ready: boolean) => void;
};

const MAAS_MODELS_ERROR_TITLE = 'Failed to load MaaS models';
const MAAS_MODELS_ERROR_MESSAGE = 'Check that the selected MaaS connection is valid and try again.';
const MODEL_RESTORE_WARNING_TITLE = 'Some previously selected models are unavailable';
const MODEL_RESTORE_WARNING_MESSAGE =
  'One or more previously selected foundation or embedding models are no longer available and have been removed from your selection.';

function AutoragConfigure({
  initialValues,
  initialInputDataSecret,
  initialVectorDbSecret,
  isReconfigure = false,
  onMaaSModelsReady,
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
  const initialInputDataKey = initialValues?.input_data_keys?.[0];

  const [selectedSecret, setSelectedSecret] = useState<SecretSelection | undefined>(
    initialInputDataSecret,
  );
  const [selectedInputDataFile, setSelectedInputDataFile] = useState<ExplorerFile | undefined>(
    () => {
      if (!initialInputDataKey) {
        return undefined;
      }
      return getSelectedInputDataFile(initialInputDataKey);
    },
  );
  // Tracks whether the S3 file browser's "Select" primary action already fired the Knowledge
  // Source Configured event for the current open/close cycle, so onClose doesn't also fire it
  // as a cancel (onClose is invoked right after onSelectFiles when the user selects a file).
  const inputDataS3SelectionCommittedRef = useRef(false);
  const secretsRefreshRef = useRef<(() => Promise<SecretListItem[] | undefined>) | null>(null);

  const notification = useNotification();
  const { onKnowledgeSourceConfigured } = useRunTriggeredTracking();

  const form = useFormContext<ConfigureSchema>();
  const { getValues, reset, setValue, formState } = form;
  const { isSubmitting } = formState;
  const maasSecretName = form.watch('maas_secret_name');
  const maasModelsQuery = useMaaSModelsQuery(namespace ?? '', maasSecretName);
  const maasModels = React.useMemo(
    () => maasModelsQuery.data?.models ?? [],
    [maasModelsQuery.data],
  );
  const hasMaaSModelsData = !!maasModelsQuery.data;
  const maasModelsError = maasModelsQuery.isError && !hasMaaSModelsData;
  const maasModelsLoaded = hasMaaSModelsData;
  const maasModelsErrorRef = useRef<string>();
  const maasModelsSecretRef = useRef(maasSecretName);
  const reconciledMaaSResultRef = useRef<string>();

  useEffect(() => {
    if (maasModelsSecretRef.current !== maasSecretName) {
      maasModelsSecretRef.current = maasSecretName;
      maasModelsErrorRef.current = undefined;
    }
    if (!maasModelsError || !maasSecretName) {
      return;
    }

    const errorKey = `${maasSecretName}:${maasModelsQuery.error.message}`;
    if (maasModelsErrorRef.current === errorKey) {
      return;
    }

    maasModelsErrorRef.current = errorKey;
    notification.error(MAAS_MODELS_ERROR_TITLE, MAAS_MODELS_ERROR_MESSAGE);
  }, [maasModelsError, maasModelsQuery.error, maasSecretName, notification]);

  const [
    inputDataSecretName,
    inputDataBucketName,
    testDataSecretName,
    testDataBucketName,
    inputDataKeys,
    generationModels,
    embeddingModels,
  ] = useWatch({
    control: form.control,
    name: [
      'input_data_secret_name',
      'input_data_bucket_name',
      'test_data_secret_name',
      'test_data_bucket_name',
      'input_data_keys',
      'generation_models',
      'embedding_models',
    ],
  });

  useEffect(() => {
    if (!maasModelsLoaded) {
      onMaaSModelsReady?.(false);
    }
  }, [maasModelsLoaded, onMaaSModelsReady]);

  useEffect(() => {
    if (!maasModelsLoaded) {
      return;
    }

    const availableModelIds = new Set(
      maasModels.filter((model) => model.ready).map((model) => model.id),
    );
    const restoredGenerationModels = generationModels.filter((id) => availableModelIds.has(id));
    const restoredEmbeddingModels = embeddingModels.filter((id) => availableModelIds.has(id));
    onMaaSModelsReady?.(
      maasModels.length > 0 &&
        restoredGenerationModels.length > 0 &&
        restoredEmbeddingModels.length > 0,
    );

    const resultKey = `${maasSecretName}:${maasModels
      .map((model) => `${model.id}:${model.ready}`)
      .toSorted()
      .join('|')}`;
    if (reconciledMaaSResultRef.current === resultKey) {
      return;
    }
    reconciledMaaSResultRef.current = resultKey;

    const modelsWereRemoved =
      restoredGenerationModels.length !== generationModels.length ||
      restoredEmbeddingModels.length !== embeddingModels.length;

    if (modelsWereRemoved) {
      setValue('generation_models', restoredGenerationModels, { shouldValidate: true });
      setValue('embedding_models', restoredEmbeddingModels, { shouldValidate: true });
      if (isReconfigure) {
        notification.warning(MODEL_RESTORE_WARNING_TITLE, MODEL_RESTORE_WARNING_MESSAGE);
      }
    }
  }, [
    embeddingModels,
    generationModels,
    isReconfigure,
    maasModels,
    maasModelsLoaded,
    maasSecretName,
    notification,
    onMaaSModelsReady,
    setValue,
  ]);

  const inputDataKey = inputDataKeys[0] ?? '';
  // On Back → Next, RHF retains the selected key while this component's display state remounts.
  // Hydrate the display from RHF only when there is no local selection to preserve user edits.
  useEffect(() => {
    if (inputDataKey && !selectedInputDataFile) {
      setSelectedInputDataFile(getSelectedInputDataFile(inputDataKey));
    }
  }, [inputDataKey, selectedInputDataFile]);
  // Model discovery is intentionally deferred to the MaaS model-table migration.
  const { mutateAsync: uploadFileToS3 } = useS3FileUploadMutation('');

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
    setValue('input_data_keys', [], { shouldValidate: true });
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

  const uploadInputDataFiles = useCallback(
    async (files: File[], folder: string) => {
      const prefix = folder.replace(/^\/+|\/+$/g, '');
      return Promise.all(
        files.map((file) =>
          uploadFileToS3({
            namespace: namespace ?? '',
            secretName: inputDataSecretName,
            bucket: inputDataBucketName,
            key: prefix ? `${prefix}/${file.name}` : file.name,
            file,
          }).then((result) => ({ key: result.key })),
        ),
      );
    },
    [inputDataBucketName, inputDataSecretName, namespace, uploadFileToS3],
  );

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
                              render={({ field: { onChange, value } }) => (
                                <SecretSelector
                                  namespace={String(namespace)}
                                  type="storage"
                                  additionalRequiredKeys={REQUIRED_CONNECTION_SECRET_KEYS}
                                  isDisabled={isSubmitting}
                                  value={selectedSecret?.uuid}
                                  valueName={value}
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
                            variant="secondary"
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
                        <Content component="h4">Knowledge documents</Content>
                      </StackItem>

                      <StackItem>
                        <Content component="small">
                          Select or upload a file or folder to use as the knowledge source for your
                          experiment.
                        </Content>
                      </StackItem>
                      <StackItem>
                        <Button
                          key="select-files"
                          variant="secondary"
                          data-testid="add-knowledge-files-button"
                          onClick={() => setFileExplorerMode('input_data')}
                          isDisabled={
                            !inputDataSecretName || selectedSecret?.invalid || isSubmitting
                          }
                        >
                          {inputDataKeys.length || selectedInputDataFile
                            ? 'Replace files'
                            : 'Add files'}
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
                                  <span title={selectedInputDataFile.path}>
                                    <Truncate content={selectedInputDataFile.name} />
                                  </span>
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
                                        setValue('input_data_keys', [], { shouldValidate: true });
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
                    titleText="Select a file from your S3 connection or upload a file to get started"
                    headingLevel="h4"
                    icon={CubesIcon}
                  >
                    <EmptyStateBody>
                      In order to configure details and run an experiment, select a file or upload
                      one in the Knowledge setup panel.
                    </EmptyStateBody>
                  </EmptyState>
                ) : (
                  <Flex direction={{ default: 'column' }} gap={{ default: 'gapXl' }}>
                    <FlexItem>
                      <ConfigureFormGroup
                        label="Vector database connection"
                        description="Provide connection details for a vector database."
                        isRequired
                      >
                        <AutoragVectorStoreSelector initialSecret={initialVectorDbSecret} />
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
                        isRequired
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
                            const metricDescription = METRIC_DESCRIPTIONS[field.value];
                            return (
                              <>
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
                                {metricDescription && (
                                  <FormHelperText>
                                    <HelperText>
                                      <HelperTextItem>{metricDescription}</HelperTextItem>
                                    </HelperText>
                                  </FormHelperText>
                                )}
                              </>
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
                        label="Run preset"
                        description="Choose a predefined resource allocation and optimization strategy for this run."
                        labelHelp={{
                          header: 'Run preset',
                          body: (
                            <Stack hasGutter>
                              <StackItem>
                                <Content component="p">
                                  Select how to balance ingestion speed and retrieval quality.
                                </Content>
                              </StackItem>
                              <StackItem>
                                <Content component="p">
                                  <strong>Faster:</strong> Recursive chunking only on exported text,
                                  no table-structure parsing, no LLM contextual enrichment.
                                </Content>
                              </StackItem>
                              <StackItem>
                                <Content component="p">
                                  <strong>Better quality:</strong> Explores recursive and hybrid
                                  chunking with Docling contextualization, table layout parsing, and
                                  LLM contextual enrichment.
                                </Content>
                              </StackItem>
                            </Stack>
                          ),
                        }}
                      >
                        <Controller
                          control={form.control}
                          name="preset"
                          render={({ field }) => (
                            <Flex direction={{ default: 'column' }}>
                              {[PRESET_FASTER, PRESET_BETTER_QUALITY].map((preset) => (
                                <Radio
                                  key={preset}
                                  id={`preset-${preset}`}
                                  name="preset"
                                  label={PRESET_LABELS[preset]}
                                  description={
                                    preset === PRESET_FASTER ? (
                                      <>
                                        4 vCPU, 16 GiB
                                        <br />
                                        Recursive chunking only. A good default for most datasets.
                                      </>
                                    ) : (
                                      <>
                                        8 vCPU, 32 GiB
                                        <br />
                                        Explores recursive and hybrid chunking with table parsing
                                        and contextual enrichment.
                                      </>
                                    )
                                  }
                                  isChecked={field.value === preset}
                                  isDisabled={isSubmitting}
                                  onChange={() => field.onChange(preset)}
                                  data-testid={`preset-radio-${preset}`}
                                />
                              ))}
                            </Flex>
                          )}
                        />
                      </ConfigureFormGroup>
                    </FlexItem>

                    <FlexItem>
                      <ConfigureFormGroup
                        label="Model configuration"
                        description="Select models to determine how documents are retrieved and which models generate responses."
                        isRequired
                      >
                        {maasModelsError || (maasModelsLoaded && maasModels.length === 0) ? (
                          <Alert
                            variant="danger"
                            isInline
                            title={MAAS_MODELS_ERROR_TITLE}
                            data-testid="maas-models-error"
                          >
                            <Content component="p">{MAAS_MODELS_ERROR_MESSAGE}</Content>
                            <Button
                              variant="primary"
                              onClick={openExperimentSettings}
                              isDisabled
                              data-testid="select-models-button"
                            >
                              Select models
                            </Button>
                          </Alert>
                        ) : !maasModelsLoaded ? (
                          <Skeleton
                            data-testid="maas-models-loading"
                            width="100%"
                            screenreaderText="Loading MaaS models"
                          />
                        ) : generationModels.length === 0 && embeddingModels.length === 0 ? (
                          <Alert
                            variant="warning"
                            isInline
                            title="Selected models"
                            data-testid="selected-models-warning"
                          >
                            <Content component="p">
                              No models selected. Select chat and embedding models to run the
                              experiment.
                            </Content>
                            <Button
                              variant="primary"
                              onClick={openExperimentSettings}
                              isDisabled={isSubmitting || !maasModelsLoaded}
                              data-testid="select-models-button"
                            >
                              Select models
                            </Button>
                          </Alert>
                        ) : (
                          <Card>
                            <CardHeader>
                              <Split hasGutter className="pf-v6-u-w-100">
                                <SplitItem isFilled>
                                  <CardTitle>Selected models</CardTitle>
                                </SplitItem>
                                <SplitItem>
                                  <Watch
                                    key="edit-experiment-settings"
                                    control={form.control}
                                    name="input_data_keys"
                                    render={(inputDataKeyValue) => (
                                      <Button
                                        variant="secondary"
                                        onClick={openExperimentSettings}
                                        isDisabled={
                                          !inputDataBucketName ||
                                          inputDataKeyValue.length === 0 ||
                                          form.formState.isSubmitting ||
                                          !maasModelsLoaded
                                        }
                                      >
                                        Edit
                                      </Button>
                                    )}
                                  />
                                </SplitItem>
                              </Split>
                            </CardHeader>
                            <CardBody>
                              <Stack hasGutter>
                                <StackItem>
                                  <Watch
                                    control={form.control}
                                    name="generation_models"
                                    render={(selectedGenerationModels) => (
                                      <Flex
                                        alignItems={{ default: 'alignItemsCenter' }}
                                        spacer={{ default: 'spacerNone' }}
                                        gap={{ default: 'gapSm' }}
                                      >
                                        <Content>
                                          {selectedGenerationModels.length
                                            ? `${selectedGenerationModels.length} foundation models`
                                            : 'No foundation models selected'}
                                        </Content>
                                        {!!selectedGenerationModels.length && (
                                          <Popover
                                            bodyContent={
                                              <List>
                                                {selectedGenerationModels.map((model) => (
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
                                </StackItem>
                                <StackItem>
                                  <Watch
                                    control={form.control}
                                    name="embedding_models"
                                    render={(selectedEmbeddingModels) => (
                                      <Flex
                                        alignItems={{ default: 'alignItemsCenter' }}
                                        spacer={{ default: 'spacerNone' }}
                                        gap={{ default: 'gapSm' }}
                                      >
                                        <Content>
                                          {selectedEmbeddingModels.length
                                            ? `${selectedEmbeddingModels.length} embedding models`
                                            : 'No embedding models selected'}
                                        </Content>
                                        {!!selectedEmbeddingModels.length && (
                                          <Popover
                                            bodyContent={
                                              <List>
                                                {selectedEmbeddingModels.map((model) => (
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
                                </StackItem>
                              </Stack>
                            </CardBody>
                          </Card>
                        )}
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
        apiPath="/autorag/api/v1/s3"
        namespace={namespace}
        s3SecretName={selectedSecret?.name ?? inputDataSecretName}
        isOpen={Boolean(fileExplorerMode)}
        onClose={() => {
          if (fileExplorerMode === 'input_data' && !inputDataS3SelectionCommittedRef.current) {
            fireAutoragKnowledgeSourceConfigured({
              knowledgeSourceType: 's3',
              countOfDocuments: 0,
              outcome: TrackingOutcome.cancel,
              // No file was ever selected/committed, so nothing was actually configured —
              // `success: true` would misleadingly imply the milestone was completed.
              success: false,
            });
          }
          inputDataS3SelectionCommittedRef.current = false;
          setFileExplorerMode(false);
        }}
        onSelectFiles={(files) => {
          if (files.length > 0) {
            const file = files[0];
            const filePath = file.path.replace(/^\//, '');
            if (fileExplorerMode === 'input_data') {
              setValue('input_data_keys', [filePath], { shouldValidate: true });
              setSelectedInputDataFile(file);
              inputDataS3SelectionCommittedRef.current = true;
              fireAutoragKnowledgeSourceConfigured({
                knowledgeSourceType: 's3',
                // Only files[0] is ever committed to input_data_keys, so report 1 committed
                // document regardless of how many files the picker returned (e.g. a folder).
                countOfDocuments: 1,
                outcome: TrackingOutcome.submit,
                success: true,
              });
              onKnowledgeSourceConfigured('s3');
            }
            if (fileExplorerMode === 'test_data') {
              setValue('test_data_key', filePath, { shouldValidate: true });
            }
          }
        }}
        uploadFiles={fileExplorerMode === 'input_data' ? uploadInputDataFiles : undefined}
        uploadConfig={{
          accept: INPUT_DATA_UPLOAD_NATIVE_ACCEPT,
          maxFiles: AUTORAG_UPLOAD_MAX_FILES,
          maxSize: AUTORAG_UPLOAD_MAX_BYTES,
          validateFile: (file) =>
            isAllowedInputDataUploadFile(file) ? undefined : 'File type is not supported.',
        }}
        selectableExtensions={SUPPORTED_FORMAT_EXTENSIONS}
        unselectableReason={SUPPORTED_FORMAT_HINT}
        disabledPaths={{
          '/autogluon-tabular-training-pipeline': SYSTEM_FOLDER_DISABLED_REASON,
          '/autogluon-timeseries-training-pipeline': SYSTEM_FOLDER_DISABLED_REASON,
        }}
      />
      {isTemplateModalOpen && (
        <EvaluationTemplateModal onClose={() => setIsTemplateModalOpen(false)} />
      )}
      <AutoragExperimentSettings
        isOpen={isExperimentSettingsOpen}
        models={maasModels}
        modelsLoaded={maasModelsLoaded && maasModels.length > 0}
        modelsLoading={maasModelsQuery.isLoading}
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
