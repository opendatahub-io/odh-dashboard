import {
  Button,
  FormHelperText,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  MenuToggle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  NumberInput,
  Radio,
  Select,
  SelectList,
  SelectOption,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import React, { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import {
  ConfigureSchema,
  EXPERIMENT_SETTINGS_FIELDS,
  MIN_TOP_N,
  MAX_TOP_N,
  TASK_TYPE_BINARY,
  TASK_TYPE_MULTICLASS,
  TASK_TYPE_REGRESSION,
} from '~/app/schemas/configure.schema';
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

type AutomlExperimentSettingsProps = {
  isOpen: boolean;
  onClose: () => void;
  revertChanges: () => void;
  saveChanges: () => void;
};

const AutomlExperimentSettings: React.FC<AutomlExperimentSettingsProps> = ({
  isOpen,
  onClose,
  revertChanges,
  saveChanges,
}) => {
  const {
    control,
    watch,
    formState: { isDirty, errors },
  } = useFormContext<ConfigureSchema>();

  const { data: columns = [] } = useFilesQuery();
  const [isLabelColumnOpen, setIsLabelColumnOpen] = useState(false);

  const labelColumn = watch('label_column');
  const hasFieldErrors = EXPERIMENT_SETTINGS_FIELDS.some((field) => errors[field]);
  const isFormIncomplete = !labelColumn;

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={() => {
        revertChanges();
        onClose();
      }}
      data-testid="experiment-settings-modal"
    >
      <ModalHeader title="Experiment settings" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <Title headingLevel="h6" className="pf-v6-u-mb-md">
              Prediction type
              <span className="pf-v6-u-text-color-required" aria-hidden="true">
                {' *'}
              </span>
            </Title>
            <Controller
              control={control}
              name="task_type"
              render={({ field }) => (
                <Stack hasGutter>
                  {PREDICTION_TYPES.map((type) => (
                    <StackItem key={type.value}>
                      <Radio
                        id={`task-type-${type.value}`}
                        name="task_type"
                        label={type.label}
                        description={type.description}
                        isChecked={field.value === type.value}
                        onChange={() => field.onChange(type.value)}
                        data-testid={`task-type-radio-${type.value}`}
                      />
                    </StackItem>
                  ))}
                </Stack>
              )}
            />
          </StackItem>

          <StackItem className="pf-v6-u-mt-lg">
            <Grid hasGutter>
              <GridItem span={8}>
                <Title headingLevel="h6" className="pf-v6-u-mb-md">
                  Label column
                  <span className="pf-v6-u-text-color-required" aria-hidden="true">
                    {' *'}
                  </span>
                </Title>
                <Controller
                  control={control}
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
              </GridItem>
              <GridItem span={4}>
                <Title headingLevel="h6" className="pf-v6-u-mb-md">
                  Top models to consider
                </Title>
                <Controller
                  control={control}
                  name="top_n"
                  render={({ field, fieldState }) => (
                    <>
                      <NumberInput
                        id="top-n-input"
                        value={field.value}
                        min={MIN_TOP_N}
                        max={MAX_TOP_N}
                        validated={fieldState.error ? 'error' : 'default'}
                        onMinus={() => field.onChange(field.value - 1)}
                        onPlus={() => field.onChange(field.value + 1)}
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
              </GridItem>
            </Grid>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={saveChanges}
          isDisabled={!isDirty || hasFieldErrors || isFormIncomplete}
          data-testid="experiment-settings-save"
        >
          Save
        </Button>
        <Button
          variant="link"
          onClick={() => {
            revertChanges();
            onClose();
          }}
          data-testid="experiment-settings-cancel"
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default AutomlExperimentSettings;
