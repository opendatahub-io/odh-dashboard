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
  Select,
  SelectList,
  SelectOption,
  Split,
  SplitItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { CubesIcon, InfoCircleIcon } from '@patternfly/react-icons';
import { findKey } from 'es-toolkit';
import { DashboardPopupIconButton } from 'mod-arch-shared';
import React, { useEffect, useRef, useState } from 'react';
import { Controller, useFormContext, useWatch, Watch } from 'react-hook-form';
import { Navigate, useParams } from 'react-router';
import AutoragConnectionModal from '~/app/components/common/AutoragConnectionModal';
import ConfigureFormGroup from '~/app/components/common/ConfigureFormGroup';
import S3FileExplorer from '~/app/components/common/S3FileExplorer/S3FileExplorer.tsx';
import SecretSelector, { SecretSelection } from '~/app/components/common/SecretSelector';
import { useLlamaStackModelsQuery } from '~/app/hooks/queries';
import {
  ConfigureSchema,
  MIN_RAG_PATTERNS,
  MAX_RAG_PATTERNS,
  RAG_METRIC_FAITHFULNESS,
  RAG_METRIC_ANSWER_CORRECTNESS,
  RAG_METRIC_CONTEXT_CORRECTNESS,
} from '~/app/schemas/configure.schema';
import { SecretListItem } from '~/app/types';
import { autoragExperimentsPathname } from '~/app/utilities/routes';
import { getMissingRequiredKeys } from '~/app/utilities/secretValidation';
import AutoragExperimentSettings from './AutoragExperimentSettings';
import AutoragVectorStoreSelector from './AutoragVectorStoreSelector';

const AUTORAG_REQUIRED_KEYS: { [type: string]: string[] } = { s3: ['aws_s3_bucket'] };

const OPTIMIZATION_METRICS: {
  value: ConfigureSchema['optimization_metric'];
  label: string;
  description: string;
}[] = [
  {
    value: RAG_METRIC_FAITHFULNESS,
    label: 'Answer faithfulness',
    description: 'How factually grounded the answer is in the retrieved context.',
  },
  {
    value: RAG_METRIC_ANSWER_CORRECTNESS,
    label: 'Answer correctness',
    description: 'How correct the generated answer is compared to the ground truth.',
  },
  {
    value: RAG_METRIC_CONTEXT_CORRECTNESS,
    label: 'Context correctness',
    description: 'How precisely the retrieval step identifies relevant chunks.',
  },
];

function AutoragConfigure(): React.JSX.Element {
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
  const [selectedSecret, setSelectedSecret] = useState<SecretSelection | undefined>();
  const secretsRefreshRef = useRef<(() => Promise<SecretListItem[] | undefined>) | null>(null);
  const modelsInitialized = useRef(false);

  const form = useFormContext<ConfigureSchema>();
  const { getValues, reset, setValue } = form;

  const [
    llamaStackSecretName,
    inputDataSecretName,
    inputDataBucketName,
    testDataSecretName,
    testDataBucketName,
  ] = useWatch({
    control: form.control,
    name: [
      'llama_stack_secret_name',
      'input_data_secret_name',
      'input_data_bucket_name',
      'test_data_secret_name',
      'test_data_bucket_name',
    ],
  });

  const { data: allModelsData } = useLlamaStackModelsQuery(namespace ?? '', llamaStackSecretName);

  // Reset modelsInitialized when the LlamaStack secret changes so models re-populate
  useEffect(() => {
    modelsInitialized.current = false;
  }, [llamaStackSecretName]);

  useEffect(() => {
    // Initialize available generation and embedding models into the form data
    if (allModelsData?.models && !modelsInitialized.current) {
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
  }, [allModelsData, getValues, reset]);

  // set bucket from selected secret
  useEffect(() => {
    // reset bucket if secret is removed
    if (!selectedSecret) {
      setValue('input_data_bucket_name', '', { shouldValidate: true });
      return;
    }

    const bucketKey = findKey(
      selectedSecret.data,
      (value, key) => key.toLowerCase() === 'aws_s3_bucket',
    );
    setValue('input_data_bucket_name', bucketKey ? selectedSecret.data[bucketKey] : '', {
      shouldValidate: true,
    });
  }, [selectedSecret, setValue]);

  // ensure input and test have the same secret and bucket
  useEffect(() => {
    if (inputDataSecretName !== testDataSecretName) {
      setValue('test_data_secret_name', inputDataSecretName, { shouldValidate: true });
    }
    if (inputDataBucketName !== testDataBucketName) {
      setValue('test_data_bucket_name', inputDataBucketName, { shouldValidate: true });
    }
  }, [inputDataBucketName, inputDataSecretName, setValue, testDataBucketName, testDataSecretName]);

  // reset selected file values if input secret or bucket changes
  useEffect(() => {
    setValue('input_data_key', '', { shouldValidate: true });
  }, [inputDataSecretName, inputDataBucketName, setValue]);

  // reset selected file values if test secret or bucket changes
  useEffect(() => {
    setValue('test_data_key', '', { shouldValidate: true });
  }, [testDataSecretName, testDataBucketName, setValue]);

  const openExperimentSettings = () => {
    // Snapshot current form values as the "default" so reset() can revert to them
    reset({ ...getValues() });
    setIsExperimentSettingsOpen(true);
  };

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
                                  additionalRequiredKeys={AUTORAG_REQUIRED_KEYS}
                                  value={selectedSecret?.uuid}
                                  onChange={(secret) => {
                                    if (!secret) {
                                      setSelectedSecret(undefined);
                                      onChange('');
                                      return;
                                    }

                                    const requiredKeys =
                                      AUTORAG_REQUIRED_KEYS[secret.type ?? ''] ?? [];
                                    const availableKeys = Object.keys(secret.data);
                                    const invalid =
                                      getMissingRequiredKeys(requiredKeys, availableKeys).length >
                                      0;
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
                      <StackItem className="pf-v6-u-font-size-md pf-v6-u-mb-sm pf-v6-u-mt-md">
                        Selected files
                      </StackItem>
                      <StackItem>
                        <Button
                          key="select-files"
                          variant="secondary"
                          onClick={() => setFileExplorerMode('input_data')}
                          isDisabled={
                            !selectedSecret || selectedSecret.invalid || form.formState.isSubmitting
                          }
                        >
                          Select files
                        </Button>
                      </StackItem>
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
                {!inputDataSecretName ? (
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
                        label="Vector database location"
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
                            <Button variant="link" isInline component="span" onClick={() => null}>
                              evaluation dataset template
                            </Button>
                            <span>.</span>
                          </>
                        }
                      >
                        Evaluation data source upload component
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
                                  render={(inputDataKey) => (
                                    <Button
                                      variant="secondary"
                                      onClick={openExperimentSettings}
                                      isDisabled={
                                        !inputDataBucketName ||
                                        !inputDataKey ||
                                        form.formState.isSubmitting
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
                              </StackItem>
                              <StackItem>
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
              const requiredKeys = AUTORAG_REQUIRED_KEYS[secret.type ?? ''] ?? [];
              const availableKeys = Object.keys(secret.data);
              const invalid = getMissingRequiredKeys(requiredKeys, availableKeys).length > 0;
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
              // TODO: Once test data upload is hooked up, remove this fallback
              setValue('test_data_key', 'watsonx_benchmark.json', { shouldValidate: true });
            }
            if (fileExplorerMode === 'test_data') {
              setValue('test_data_key', filePath, { shouldValidate: true });
            }
          }
        }}
        selectableExtensions={['pdf', 'docx', 'pptx', 'md', 'html', 'txt']}
        unselectableReason="You can only select PDF, DOCX, PPTX, Markdown, HTML, or Plain text files"
      />
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
