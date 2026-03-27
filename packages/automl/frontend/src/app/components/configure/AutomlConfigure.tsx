import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  FormHelperText,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  Label,
  NumberInput,
  Panel,
  PanelMain,
  PanelMainBody,
  PanelFooter,
  Popover,
  Content,
  Gallery,
  Split,
  SplitItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import React, { useEffect, useState, useRef } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardPopupIconButton } from 'mod-arch-shared';
import { useWatchConnectionTypes } from '@odh-dashboard/internal/utilities/useWatchConnectionTypes';
import { Connection } from '@odh-dashboard/internal/concepts/connectionTypes/types';
import {
  isConnectionType,
  isConnectionTypeDataField,
  S3ConnectionTypeKeys,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import {
  createConfigureSchema,
  ConfigureSchema,
  MIN_TOP_N,
  MAX_TOP_N,
  getDefaultValues,
} from '~/app/schemas/configure.schema';
import {
  TASK_TYPE_BINARY,
  TASK_TYPE_MULTICLASS,
  TASK_TYPE_REGRESSION,
  TASK_TYPE_TIMESERIES,
} from '~/app/utilities/const';
import { automlExperimentsPathname, automlResultsPathname } from '~/app/utilities/routes';
import { getMissingRequiredKeys } from '~/app/utilities/secretValidation';
import { useS3GetFileSchemaQuery, useCreatePipelineRun } from '~/app/hooks/queries';
import { SecretListItem } from '~/app/types';
import S3FileExplorer from '~/app/components/common/S3FileExplorer/S3FileExplorer.tsx';
import SecretSelector, { SecretSelection } from '~/app/components/common/SecretSelector';
import AutomlConnectionModal from '~/app/components/common/AutomlConnectionModal';
import ConfigureTabularForm from './ConfigureTabularForm';
import ConfigureTimeseriesForm from './ConfigureTimeseriesForm';

function getBucketFromSecretData(data: Record<string, string> | undefined): string {
  if (!data) {
    return '';
  }
  const key = Object.keys(data).find((k) => k.toLowerCase() === 'aws_s3_bucket');
  return key ? data[key] : '';
}

const PREDICTION_TYPES: {
  value: ConfigureSchema['task_type'];
  label: string;
  description: string;
}[] = [
  {
    value: TASK_TYPE_BINARY,
    label: 'Binary classification',
    description:
      'Classify data into categories. Choose this if your prediction column contains two distinct categories',
  },
  {
    value: TASK_TYPE_MULTICLASS,
    label: 'Multiclass classification',
    description:
      'Classify data into categories. Choose this if your prediction column contains multiple distinct categories',
  },
  {
    value: TASK_TYPE_REGRESSION,
    label: 'Regression',
    description:
      'Predict values from a continuous set of values. Choose this if your prediction column contains a large number of values',
  },
  {
    value: TASK_TYPE_TIMESERIES,
    label: 'Time series forecasting',
    description:
      'Predict future activity over a specified date/time range. Data must be structured and sequential.',
  },
];

const AUTOML_REQUIRED_KEYS: { [type: string]: string[] } = { s3: ['aws_s3_bucket'] };

const configureSchema = createConfigureSchema();

function AutomlConfigure(): React.JSX.Element {
  const navigate = useNavigate();
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
  const [selectedSecret, setSelectedSecret] = useState<SecretSelection | undefined>();
  const [submitError, setSubmitError] = useState<string | undefined>();
  const secretsRefreshRef = useRef<(() => Promise<SecretListItem[] | undefined>) | null>(null);
  const previousFileKeyRef = useRef<string | undefined>();

  const createPipelineRun = useCreatePipelineRun();

  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema),
    defaultValues: getDefaultValues(),
  });

  const {
    control,
    setValue,
    watch,
    handleSubmit,
    formState: { isSubmitting: formIsSubmitting, isValid: formIsValid },
  } = form;

  const trainDataSecretName = watch('train_data_secret_name');
  const trainDataBucketName = watch('train_data_bucket_name');
  const trainDataFileKey = watch('train_data_file_key');
  const taskType = watch('task_type');
  const isTimeseries = taskType === TASK_TYPE_TIMESERIES;

  const canSelectFiles = !selectedSecret?.invalid && Boolean(trainDataSecretName);
  const isFileSelected = Boolean(trainDataFileKey);

  const canSelectLearningType = isFileSelected;
  // && Boolean(watch('train_data_bucket_name')); // Add condition when we have bucket selection
  const formDisabled = !formIsValid || formIsSubmitting || createPipelineRun.isPending;

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

  // reset selected file values if bucket changes
  useEffect(() => {
    setValue('train_data_file_key', '');
  }, [trainDataBucketName, setValue]);

  // reset all column-related form fields when file selection changes
  useEffect(() => {
    if (trainDataFileKey && trainDataFileKey !== previousFileKeyRef.current) {
      // Reset tabular form fields
      setValue('label_column', '');

      // Reset timeseries form fields
      setValue('target', '');
      setValue('timestamp_column', '');
      setValue('id_column', '');
      setValue('known_covariates_names', []);
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
      setValue('label_column', '');
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
      if (watch('prediction_length') === undefined) {
        setValue('prediction_length', 1);
      }
      if (watch('known_covariates_names') === undefined) {
        setValue('known_covariates_names', []);
      }
    }
  }, [taskType, watch, setValue]);

  const onSubmit = handleSubmit(async (data) => {
    if (!namespace) {
      return;
    }

    setSubmitError(undefined);

    try {
      const pipelineRun = await createPipelineRun.mutateAsync({
        namespace,
        data,
      });

      navigate(`${automlResultsPathname}/${namespace}/${pipelineRun.run_id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create pipeline run';
      setSubmitError(errorMessage);
    }
  });

  if (!namespace) {
    return <Navigate to={automlExperimentsPathname} replace />;
  }

  return (
    <FormProvider {...form}>
      <Panel isScrollable={false}>
        <PanelMain tabIndex={0}>
          <PanelMainBody>
            <Grid hasGutter>
              <GridItem span={4}>
                <Card className="pf-v6-u-h-100">
                  <CardTitle>Documents</CardTitle>
                  <CardBody>
                    <Stack>
                      <StackItem className="pf-v6-u-font-size-sm pf-v6-u-mb-sm">
                        Select or add an S3 connection to upload files or browse existing files.
                      </StackItem>
                      <StackItem>
                        <Split
                          style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                          }}
                        >
                          <SplitItem isFilled data-temp-placeholder style={{ marginRight: '1rem' }}>
                            {Boolean(namespace) && (
                              <Controller
                                control={control}
                                name="train_data_secret_name"
                                render={({ field: { onChange } }) => (
                                  <SecretSelector
                                    namespace={String(namespace)}
                                    type="storage"
                                    additionalRequiredKeys={AUTOML_REQUIRED_KEYS}
                                    value={selectedSecret?.uuid}
                                    onChange={(secret) => {
                                      setNewConnectionNotLoaded(false);
                                      setSelectedSecret(secret);
                                      onChange(secret?.invalid ? '' : secret?.name);
                                      setValue(
                                        'train_data_bucket_name',
                                        getBucketFromSecretData(secret?.data),
                                      );
                                    }}
                                    onRefreshReady={(refresh) => {
                                      secretsRefreshRef.current = refresh;
                                    }}
                                    label="S3 connection"
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
                              onClick={() => setIsConnectionModalOpen(true)}
                            >
                              Add new connection
                            </Button>
                          </SplitItem>
                        </Split>
                      </StackItem>
                      {newConnectionNotLoaded && (
                        <StackItem className="pf-v6-u-mt-md">
                          <Alert variant="warning" isInline title="Connection added">
                            The connection was created but could not be loaded. Please refresh the
                            page to see it.
                          </Alert>
                        </StackItem>
                      )}
                      {Boolean(selectedSecret?.uuid) && (
                        <>
                          <StackItem className="pf-v6-u-font-size-md pf-v6-u-mb-sm pf-v6-u-mt-md">
                            Selected connection
                          </StackItem>
                          <StackItem>
                            <Label
                              onClose={() => {
                                setSelectedSecret(undefined);
                                // Clear selections
                                setValue('train_data_secret_name', '');
                                setValue('train_data_bucket_name', '');
                                setValue('train_data_file_key', '');
                              }}
                              closeBtnAriaLabel="Clear selected connection"
                            >
                              {selectedSecret?.displayName ?? selectedSecret?.name}
                            </Label>
                          </StackItem>

                          <StackItem className="pf-v6-u-font-size-md pf-v6-u-mb-sm pf-v6-u-mt-md">
                            Selected files
                          </StackItem>
                          <StackItem>
                            <Button
                              key="select-files"
                              variant="secondary"
                              onClick={() => setIsFileExplorerOpen(true)}
                              isDisabled={!canSelectFiles}
                            >
                              Select files
                            </Button>
                          </StackItem>
                        </>
                      )}
                    </Stack>
                  </CardBody>
                </Card>
              </GridItem>
              <GridItem span={8}>
                <Card className="pf-v6-u-h-100">
                  <CardTitle>Configure details</CardTitle>
                  <CardBody>
                    <Stack hasGutter style={{ gap: 'var(--pf-t--global--spacer--xl)' }}>
                      <StackItem>
                        <div className="pf-v6-u-font-weight-bold pf-v6-u-font-size-sm pf-v6-u-mb-sm">
                          Prediction type
                          <span className="pf-v6-u-text-color-required" aria-hidden="true">
                            {' *'}
                          </span>
                        </div>
                        <Controller
                          control={form.control}
                          name="task_type"
                          render={({ field }) => (
                            <Gallery hasGutter minWidths={{ default: '200px' }}>
                              {PREDICTION_TYPES.map((type) => (
                                <Card
                                  key={type.value}
                                  isSelectable
                                  isDisabled={!canSelectLearningType}
                                  isSelected={field.value === type.value}
                                  onClick={() => field.onChange(type.value)}
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
                      </StackItem>

                      {isTimeseries ? (
                        <ConfigureTimeseriesForm
                          columns={columns}
                          isLoadingColumns={isLoadingColumns}
                          isFetchingColumns={isFetchingColumns}
                          columnsError={columnsError}
                          isFileSelected={isFileSelected}
                          formIsSubmitting={formIsSubmitting}
                        />
                      ) : (
                        <ConfigureTabularForm
                          columns={columns}
                          isLoadingColumns={isLoadingColumns}
                          isFetchingColumns={isFetchingColumns}
                          columnsError={columnsError}
                          isFileSelected={isFileSelected}
                          formIsSubmitting={formIsSubmitting}
                        />
                      )}

                      <StackItem>
                        <div className="pf-v6-u-font-weight-bold pf-v6-u-font-size-sm pf-v6-u-mb-sm">
                          Top models to consider
                          <Popover
                            aria-label="Top models to consider help"
                            headerContent="Top models to consider"
                            bodyContent="Number of top models to select and refit. The pipeline will train multiple models and select the best performing ones for final training."
                          >
                            <DashboardPopupIconButton
                              icon={<OutlinedQuestionCircleIcon />}
                              aria-label="More info for top models to consider"
                            />
                          </Popover>
                        </div>
                        <Controller
                          control={form.control}
                          name="top_n"
                          render={({ field, fieldState }) => (
                            <>
                              <NumberInput
                                id="top-n-input"
                                value={field.value}
                                min={MIN_TOP_N}
                                max={MAX_TOP_N}
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
                      </StackItem>
                    </Stack>
                  </CardBody>
                </Card>
              </GridItem>
            </Grid>
          </PanelMainBody>
        </PanelMain>
        <PanelFooter>
          <Stack hasGutter>
            {submitError && (
              <StackItem>
                <Alert variant="danger" isInline title="Failed to create experiment">
                  {submitError}
                </Alert>
              </StackItem>
            )}
            <StackItem>
              <Button variant="primary" isDisabled={formDisabled} onClick={onSubmit}>
                Run experiment
              </Button>
            </StackItem>
          </Stack>
        </PanelFooter>
      </Panel>

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
              const requiredKeys = AUTOML_REQUIRED_KEYS[secret.type ?? ''] ?? [];
              const availableKeys = Object.keys(secret.data ?? connection.stringData ?? {});
              const invalid = getMissingRequiredKeys(requiredKeys, availableKeys).length > 0;
              setSelectedSecret({
                ...secret,
                invalid,
              });
              setValue('train_data_secret_name', invalid ? '' : secret.name);
              setValue(
                'train_data_bucket_name',
                invalid ? '' : getBucketFromSecretData(secret.data ?? connection.stringData),
              );
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
          }
        }}
        selectableExtensions={['csv']}
        unselectableReason="You can only select CSV files"
      />
    </FormProvider>
  );
}

export default AutomlConfigure;
