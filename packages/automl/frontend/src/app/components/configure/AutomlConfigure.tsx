import {
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
  MenuToggle,
  NumberInput,
  Panel,
  PanelMain,
  PanelMainBody,
  PanelFooter,
  Content,
  Gallery,
  Select,
  SelectList,
  SelectOption,
  Split,
  SplitItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import createConfigureSchema, {
  ConfigureSchema,
  MIN_TOP_N,
  MAX_TOP_N,
  TASK_TYPE_BINARY,
  TASK_TYPE_MULTICLASS,
  TASK_TYPE_REGRESSION,
} from '~/app/schemas/configure.schema';
import { automlResultsPathname } from '~/app/utilities/routes';
import FileExplorer from '~/app/components/common/FileExplorer/FileExplorer.tsx';
import SecretSelector, { SecretSelection } from '~/app/components/common/SecretSelector';
import { useFilesQuery } from '~/app/hooks/queries';
import { SecretListItem } from '~/app/types';

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
];

const AUTOML_REQUIRED_KEYS: { [type: string]: string[] } = { s3: ['aws_s3_bucket'] };

const configureSchema = createConfigureSchema();

function AutomlConfigure(): React.JSX.Element {
  const navigate = useNavigate();
  const { namespace } = useParams();
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState<boolean>(false);
  const secretsRefreshRef = useRef<(() => Promise<SecretListItem[] | undefined>) | null>(null);
  const [selectedSecret, setSelectedSecret] = useState<SecretSelection | undefined>();

  const [isLabelColumnOpen, setIsLabelColumnOpen] = useState(false);

  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema),
    defaultValues: configureSchema.parse({}),
  });

  const {
    control,
    setValue,
    watch,
    formState: { isSubmitting: formIsSubmitting, isValid: formIsValid },
  } = form;

  const trainDataSecretName = watch('train_data_secret_name');
  const trainDataBucketName = watch('train_data_bucket_name');
  const trainDataFileKey = watch('train_data_file_key');

  const canSelectFiles = !selectedSecret?.invalid && Boolean(trainDataSecretName);
  const isFileSelected = Boolean(trainDataFileKey);

  const canSelectLearningType = isFileSelected;
  // && Boolean(watch('train_data_bucket_name')); // Add condition when we have bucket selection
  const formDisabled = !formIsValid || formIsSubmitting;

  const { data: columns = [] } = useFilesQuery();

  // reset selected file values if bucket changes
  useEffect(() => {
    setValue('train_data_file_key', undefined);
  }, [trainDataBucketName, setValue]);

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
                                      setSelectedSecret(secret);
                                      onChange(secret?.invalid ? undefined : secret?.name);
                                      const bucketKey = Object.keys(secret?.data ?? {}).find(
                                        (key) => key.toLowerCase() === 'aws_s3_bucket',
                                      );
                                      setValue(
                                        'train_data_bucket_name',
                                        bucketKey ? secret?.data[bucketKey] : undefined,
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
                              onClick={() => null}
                            >
                              Add new connection
                            </Button>
                          </SplitItem>
                        </Split>
                      </StackItem>
                      {Boolean(selectedSecret?.uuid) && (
                        <>
                          <StackItem className="pf-v6-u-font-size-md pf-v6-u-mb-sm pf-v6-u-mt-md">
                            Selected connection
                          </StackItem>
                          <StackItem>
                            <Label
                              onClose={() => {
                                setSelectedSecret(undefined);
                                setValue('train_data_secret_name', undefined);
                                setValue('train_data_bucket_name', undefined);
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

                      <StackItem>
                        <div className="pf-v6-u-font-weight-bold pf-v6-u-font-size-sm pf-v6-u-mb-sm">
                          Label column
                          <span className="pf-v6-u-text-color-required" aria-hidden="true">
                            {' *'}
                          </span>
                        </div>
                        <Controller
                          control={form.control}
                          name="label_column"
                          render={({ field }) => (
                            <Select
                              id="label-column-select"
                              isOpen={isLabelColumnOpen}
                              onOpenChange={setIsLabelColumnOpen}
                              onSelect={(_event, value) => {
                                field.onChange(value);
                                setIsLabelColumnOpen(false);
                              }}
                              selected={field.value}
                              toggle={(toggleRef) => (
                                <MenuToggle
                                  ref={toggleRef}
                                  onClick={() => setIsLabelColumnOpen((prev) => !prev)}
                                  isExpanded={isLabelColumnOpen}
                                  isDisabled={!isFileSelected || columns.length === 0}
                                  isFullWidth
                                  data-testid="label-column-select"
                                >
                                  {field.value || 'Select a column'}
                                </MenuToggle>
                              )}
                            >
                              <SelectList>
                                {columns.map((column) => (
                                  <SelectOption key={column} value={column}>
                                    {column}
                                  </SelectOption>
                                ))}
                              </SelectList>
                            </Select>
                          )}
                        />
                      </StackItem>

                      <StackItem>
                        <div className="pf-v6-u-font-weight-bold pf-v6-u-font-size-sm pf-v6-u-mb-sm">
                          Top models to consider
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
          <Button
            variant="primary"
            isDisabled={formDisabled}
            onClick={() => {
              navigate(`${automlResultsPathname}/FAKE_RUN_ID`);
            }}
          >
            Run experiment
          </Button>
        </PanelFooter>
      </Panel>

      <FileExplorer
        id="AutoMlConfigure-FileExplorer"
        isOpen={isFileExplorerOpen}
        onClose={() => setIsFileExplorerOpen(false)}
        onSelect={(files) => null /* eslint-disable-line @typescript-eslint/no-unused-vars */}
      />
    </FormProvider>
  );
}

export default AutomlConfigure;
