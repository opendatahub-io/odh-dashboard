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
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
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
import { useFilesQuery } from '~/app/hooks/queries';

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

const configureSchema = createConfigureSchema();

function AutomlConfigure(): React.JSX.Element {
  const navigate = useNavigate();

  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState<boolean>(false);
  const [isLabelColumnOpen, setIsLabelColumnOpen] = useState(false);

  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema),
    defaultValues: configureSchema.parse({}),
  });

  const {
    formState: { isValid: formIsValid },
  } = form;
  const formDisabled = !formIsValid;

  const trainDataFileKey = form.watch('train_data_file_key');
  const isFileSelected = Boolean(trainDataFileKey);

  const { data: columns = [] } = useFilesQuery();

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
                        <Split>
                          <SplitItem isFilled data-temp-placeholder>
                            Connections dropdown
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

                      <StackItem className="pf-v6-u-font-size-md pf-v6-u-mb-sm pf-v6-u-mt-md">
                        Selected connection
                      </StackItem>
                      <StackItem>
                        <Label onClose={() => null}>S3 connection test</Label>
                      </StackItem>

                      <StackItem className="pf-v6-u-font-size-md pf-v6-u-mb-sm pf-v6-u-mt-md">
                        Selected files
                      </StackItem>
                      <StackItem>
                        <Button
                          key="select-files"
                          variant="secondary"
                          onClick={() => setIsFileExplorerOpen(true)}
                        >
                          Select files
                        </Button>
                      </StackItem>
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
        id="AutomlConfigure-FileExplorer"
        isOpen={isFileExplorerOpen}
        onClose={() => setIsFileExplorerOpen(false)}
        onSelect={(files) => null /* eslint-disable-line @typescript-eslint/no-unused-vars */}
      />
    </FormProvider>
  );
}

export default AutomlConfigure;
