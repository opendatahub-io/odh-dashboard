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
  EmptyState,
  EmptyStateBody,
  FormHelperText,
  Gallery,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  NumberInput,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Tooltip,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { CubesIcon, TimesIcon } from '@patternfly/react-icons';
import { useQueryClient } from '@tanstack/react-query';
import { findKey } from 'es-toolkit';
import React, { useEffect, useRef, useState } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Navigate, useParams } from 'react-router';
import AutomlConnectionModal from '~/app/components/common/AutomlConnectionModal';
import ConfigureFormGroup from '~/app/components/common/ConfigureFormGroup';
import S3FileExplorer from '~/app/components/common/S3FileExplorer/S3FileExplorer.tsx';
import type { File } from '~/app/components/common/FileExplorer/FileExplorer.tsx';
import SecretSelector, { SecretSelection } from '~/app/components/common/SecretSelector';
import { useS3GetFileSchemaQuery } from '~/app/hooks/queries';
import { ConfigureSchema, MAX_TOP_N, MIN_TOP_N } from '~/app/schemas/configure.schema';
import { SecretListItem } from '~/app/types';
import {
  TASK_TYPE_BINARY,
  TASK_TYPE_MULTICLASS,
  TASK_TYPE_REGRESSION,
  TASK_TYPE_TIMESERIES,
} from '~/app/utilities/const';
import { automlExperimentsPathname } from '~/app/utilities/routes';
import { getMissingRequiredKeys } from '~/app/utilities/secretValidation';
import ConfigureTabularForm from './ConfigureTabularForm';
import ConfigureTimeseriesForm from './ConfigureTimeseriesForm';

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

function AutomlConfigure(): React.JSX.Element {
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
  const secretsRefreshRef = useRef<(() => Promise<SecretListItem[] | undefined>) | null>(null);
  const previousFileKeyRef = useRef<string | undefined>();

  const [selectedTrainingDataFile, setSelectedTrainingDataFile] = useState<File | undefined>();

  const form = useFormContext<ConfigureSchema>();

  const {
    control,
    setValue,
    getValues,
    formState: { isSubmitting: formIsSubmitting },
  } = form;

  const [trainDataSecretName, trainDataBucketName, trainDataFileKey, taskType] = useWatch({
    control: form.control,
    name: ['train_data_secret_name', 'train_data_bucket_name', 'train_data_file_key', 'task_type'],
  });
  const isTimeseries = taskType === TASK_TYPE_TIMESERIES;

  const canSelectFiles = !selectedSecret?.invalid && Boolean(trainDataSecretName);
  const isFileSelected = Boolean(trainDataFileKey);

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

  // set bucket from selected secret
  useEffect(() => {
    // reset bucket if secret is removed
    if (!selectedSecret || !selectedSecret.data) {
      setValue('train_data_bucket_name', '', { shouldValidate: true });
      return;
    }

    const bucketKey = findKey(
      selectedSecret.data,
      (value, key) => key.toLowerCase() === 'aws_s3_bucket',
    );
    setValue('train_data_bucket_name', bucketKey ? selectedSecret.data[bucketKey] : '', {
      shouldValidate: true,
    });
  }, [selectedSecret, setValue]);

  // reset selected file values if secret or bucket changes
  useEffect(() => {
    setValue('train_data_file_key', '', { shouldValidate: true });
    setSelectedTrainingDataFile(undefined);
  }, [trainDataSecretName, trainDataBucketName, setValue]);

  // reset all column-related form fields when file selection changes
  useEffect(() => {
    if (trainDataFileKey && trainDataFileKey !== previousFileKeyRef.current) {
      // Reset tabular form fields
      setValue('label_column', '', { shouldValidate: true });

      // Reset timeseries form fields
      setValue('target', '', { shouldValidate: true });
      setValue('timestamp_column', '', { shouldValidate: true });
      setValue('id_column', '', { shouldValidate: true });
      setValue('known_covariates_names', [], { shouldValidate: true });
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
                                  additionalRequiredKeys={AUTOML_REQUIRED_KEYS}
                                  value={selectedSecret?.uuid}
                                  onChange={(secret) => {
                                    if (!secret) {
                                      setSelectedSecret(undefined);
                                      onChange('');
                                      return;
                                    }

                                    const requiredKeys =
                                      AUTOML_REQUIRED_KEYS[secret.type ?? ''] ?? [];
                                    const availableKeys = Object.keys(secret.data ?? {});
                                    const invalid =
                                      getMissingRequiredKeys(requiredKeys, availableKeys).length >
                                      0;
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
                            <Td dataLabel="Name">{selectedTrainingDataFile.name}</Td>
                            <Td dataLabel="Type">{selectedTrainingDataFile.type}</Td>
                            <Td isActionCell>
                              <Tooltip content="Remove selection">
                                <Button
                                  size="sm"
                                  variant="plain"
                                  aria-label="Remove selection"
                                  icon={<TimesIcon />}
                                  onClick={() => {
                                    setSelectedTrainingDataFile(undefined);
                                    setValue('train_data_file_key', '', { shouldValidate: true });
                                  }}
                                />
                              </Tooltip>
                            </Td>
                          </Tr>
                        </Tbody>
                      </Table>
                    </StackItem>
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
                {!trainDataSecretName ? (
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
                      </ConfigureFormGroup>
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
                      </ConfigureFormGroup>
                    </StackItem>
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
              const requiredKeys = AUTOML_REQUIRED_KEYS[secret.type ?? ''] ?? [];
              const secretData = secret.data ?? connection.stringData ?? {};
              const availableKeys = Object.keys(secretData);
              const invalid = getMissingRequiredKeys(requiredKeys, availableKeys).length > 0;
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
        selectableExtensions={['csv']}
        unselectableReason="You can only select CSV files"
      />
    </>
  );
}

export default AutomlConfigure;
