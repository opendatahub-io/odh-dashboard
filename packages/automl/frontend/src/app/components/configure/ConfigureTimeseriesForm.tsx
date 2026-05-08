import {
  FormHelperText,
  HelperText,
  HelperTextItem,
  MenuToggle,
  NumberInput,
  Select,
  SelectList,
  SelectOption,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import React, { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import ConfigureFormGroup from '~/app/components/common/ConfigureFormGroup';
import { MAX_PREDICTION_LENGTH } from '~/app/schemas/configure.schema';
import { getTypeAcronym } from '~/app/utilities/columnUtils';
import LoadingFormField from './LoadingFormField';
import './AutomlConfigure.scss';

interface Column {
  name: string;
  type: string;
}

interface ConfigureTimeseriesFormProps {
  columns: Column[];
  isLoadingColumns: boolean;
  isFetchingColumns: boolean;
  columnsError: Error | null;
  isFileSelected: boolean;
  formIsSubmitting: boolean;
}

function ConfigureTimeseriesForm({
  columns,
  isLoadingColumns,
  isFetchingColumns,
  columnsError,
  isFileSelected,
  formIsSubmitting,
}: ConfigureTimeseriesFormProps): React.JSX.Element {
  const { control, watch, setValue } = useFormContext();
  const [isTimestampColumnOpen, setIsTimestampColumnOpen] = useState(false);
  const [isIdColumnOpen, setIsIdColumnOpen] = useState(false);
  const [isKnownCovariatesOpen, setIsKnownCovariatesOpen] = useState(false);

  const targetColumnValue = watch('target_column');
  const timestampValue = watch('timestamp_column');
  const idValue = watch('id_column');
  const knownCovariatesValue = watch('known_covariates_names');

  const clearColumnFromOtherFields = (selectedColumn: string, currentField: string) => {
    if (currentField !== 'timestamp_column' && timestampValue === selectedColumn) {
      setValue('timestamp_column', '', { shouldValidate: true });
    }
    if (currentField !== 'id_column' && idValue === selectedColumn) {
      setValue('id_column', '', { shouldValidate: true });
    }
    if (
      currentField !== 'known_covariates_names' &&
      knownCovariatesValue?.includes(selectedColumn)
    ) {
      setValue(
        'known_covariates_names',
        knownCovariatesValue.filter((v: string) => v !== selectedColumn),
        { shouldValidate: true },
      );
    }
  };

  return (
    <Stack hasGutter style={{ gap: 'var(--pf-t--global--spacer--xl)' }}>
      <StackItem className="automl-configure__form-field">
        <ConfigureFormGroup
          label="Timestamp column"
          labelHelp={{
            header: 'Timestamp column',
            body: 'Name of the column containing the timestamp/datetime for each observation.',
          }}
          isRequired
        >
          <LoadingFormField loading={isLoadingColumns || isFetchingColumns}>
            <Controller
              control={control}
              name="timestamp_column"
              render={({ field }) => (
                <Select
                  id="timestamp-column-select"
                  isOpen={isTimestampColumnOpen}
                  onOpenChange={setIsTimestampColumnOpen}
                  onSelect={(_event, value) => {
                    if (typeof value === 'string') {
                      clearColumnFromOtherFields(value, 'timestamp_column');
                      field.onChange(value);
                    }
                    setIsTimestampColumnOpen(false);
                  }}
                  selected={field.value}
                  maxMenuHeight="200px"
                  toggle={(toggleRef) => (
                    <MenuToggle
                      ref={toggleRef}
                      onClick={() => setIsTimestampColumnOpen((prev) => !prev)}
                      isExpanded={isTimestampColumnOpen}
                      isDisabled={
                        !isFileSelected ||
                        columns.length === 0 ||
                        !!columnsError ||
                        formIsSubmitting
                      }
                      isFullWidth
                      data-testid="timestamp_column-select"
                      status={columnsError ? 'danger' : undefined}
                    >
                      {field.value || 'Select a column'}
                    </MenuToggle>
                  )}
                >
                  <SelectList>
                    {columns.map((column) => (
                      <SelectOption
                        key={column.name}
                        value={column.name}
                        isDisabled={column.name === targetColumnValue}
                      >
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
          </LoadingFormField>
        </ConfigureFormGroup>
      </StackItem>

      <StackItem className="automl-configure__form-field">
        <ConfigureFormGroup
          label="ID column"
          labelHelp={{
            header: 'ID column',
            body: 'Name of the column that identifies each time series (e.g. product_id, store_id).',
          }}
          isRequired
        >
          <LoadingFormField loading={isLoadingColumns || isFetchingColumns}>
            <Controller
              control={control}
              name="id_column"
              render={({ field }) => (
                <Select
                  id="id-column-select"
                  isOpen={isIdColumnOpen}
                  onOpenChange={setIsIdColumnOpen}
                  onSelect={(_event, value) => {
                    if (typeof value === 'string') {
                      clearColumnFromOtherFields(value, 'id_column');
                      field.onChange(value);
                    }
                    setIsIdColumnOpen(false);
                  }}
                  selected={field.value}
                  maxMenuHeight="200px"
                  toggle={(toggleRef) => (
                    <MenuToggle
                      ref={toggleRef}
                      onClick={() => setIsIdColumnOpen((prev) => !prev)}
                      isExpanded={isIdColumnOpen}
                      isDisabled={
                        !isFileSelected ||
                        columns.length === 0 ||
                        !!columnsError ||
                        formIsSubmitting
                      }
                      isFullWidth
                      data-testid="id_column-select"
                      status={columnsError ? 'danger' : undefined}
                    >
                      {field.value || 'Select a column'}
                    </MenuToggle>
                  )}
                >
                  <SelectList>
                    {columns.map((column) => (
                      <SelectOption
                        key={column.name}
                        value={column.name}
                        isDisabled={column.name === targetColumnValue}
                      >
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
          </LoadingFormField>
        </ConfigureFormGroup>
      </StackItem>

      <StackItem className="automl-configure__form-field">
        <ConfigureFormGroup
          label="Known covariates"
          labelHelp={{
            header: 'Known covariates',
            body: 'Column names that are known in advance for all steps in the forecast horizon (e.g. holidays, promotions).',
          }}
        >
          <LoadingFormField loading={isLoadingColumns || isFetchingColumns}>
            <Controller
              control={control}
              name="known_covariates_names"
              render={({ field }) => (
                <Select
                  id="known-covariates-select"
                  isOpen={isKnownCovariatesOpen}
                  onOpenChange={setIsKnownCovariatesOpen}
                  onSelect={(_event, value) => {
                    if (typeof value !== 'string') {
                      return;
                    }
                    const currentValues: string[] = field.value || [];
                    const isRemoving = currentValues.includes(value);

                    if (!isRemoving) {
                      clearColumnFromOtherFields(value, 'known_covariates_names');
                    }

                    const newValues = isRemoving
                      ? currentValues.filter((v) => v !== value)
                      : [...currentValues, value];
                    field.onChange(newValues);
                  }}
                  selected={field.value}
                  maxMenuHeight="200px"
                  toggle={(toggleRef) => (
                    <MenuToggle
                      ref={toggleRef}
                      onClick={() => setIsKnownCovariatesOpen((prev) => !prev)}
                      isExpanded={isKnownCovariatesOpen}
                      isDisabled={
                        !isFileSelected ||
                        columns.length === 0 ||
                        !!columnsError ||
                        formIsSubmitting
                      }
                      isFullWidth
                      data-testid="known_covariates_names-select"
                      status={columnsError ? 'danger' : undefined}
                    >
                      {field.value && field.value.length > 0
                        ? `${field.value.length} column${
                            field.value.length > 1 ? 's' : ''
                          } selected`
                        : 'Select columns'}
                    </MenuToggle>
                  )}
                >
                  <SelectList>
                    {columns.map((column) => (
                      <SelectOption
                        key={column.name}
                        value={column.name}
                        hasCheckbox
                        isSelected={field.value?.includes(column.name)}
                        isDisabled={column.name === targetColumnValue}
                      >
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
          </LoadingFormField>
        </ConfigureFormGroup>
      </StackItem>

      <StackItem className="automl-configure__form-field">
        <ConfigureFormGroup
          label="Prediction length"
          labelHelp={{
            header: 'Prediction length',
            body: 'Number of time steps to forecast (horizon length). Required for training and evaluation.',
          }}
        >
          <Controller
            control={control}
            name="prediction_length"
            render={({ field, fieldState }) => (
              <>
                <NumberInput
                  id="prediction-length-input"
                  value={field.value}
                  min={1}
                  max={MAX_PREDICTION_LENGTH}
                  validated={fieldState.error ? 'error' : 'default'}
                  onMinus={() => field.onChange(Number(field.value) - 1)}
                  onPlus={() => field.onChange(Number(field.value) + 1)}
                  onChange={(event: React.FormEvent<HTMLInputElement>) => {
                    const value = parseInt(event.currentTarget.value, 10);
                    if (!Number.isNaN(value)) {
                      field.onChange(value);
                    }
                  }}
                  isDisabled={formIsSubmitting}
                  data-testid="prediction-length-input"
                />
                {fieldState.error && (
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem variant="error">{fieldState.error.message}</HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                )}
              </>
            )}
          />
        </ConfigureFormGroup>
      </StackItem>
    </Stack>
  );
}

export default ConfigureTimeseriesForm;
