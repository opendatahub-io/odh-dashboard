import {
  FormHelperText,
  HelperText,
  HelperTextItem,
  MenuToggle,
  NumberInput,
  Popover,
  Select,
  SelectList,
  SelectOption,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import React, { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { DashboardPopupIconButton } from 'mod-arch-shared';
import { getTypeAcronym } from '~/app/utilities/columnUtils';
import LoadingFormField from './LoadingFormField';

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
  const [isTargetOpen, setIsTargetOpen] = useState(false);
  const [isTimestampColumnOpen, setIsTimestampColumnOpen] = useState(false);
  const [isIdColumnOpen, setIsIdColumnOpen] = useState(false);
  const [isKnownCovariatesOpen, setIsKnownCovariatesOpen] = useState(false);

  const targetValue = watch('target');
  const timestampValue = watch('timestamp_column');
  const idValue = watch('id_column');
  const knownCovariatesValue = watch('known_covariates_names');

  const clearColumnFromOtherFields = (selectedColumn: string, currentField: string) => {
    if (currentField !== 'target' && targetValue === selectedColumn) {
      setValue('target', '', { shouldValidate: true });
    }
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
      <StackItem>
        <div className="pf-v6-u-font-weight-bold pf-v6-u-font-size-sm pf-v6-u-mb-sm">
          Target column
          <span className="pf-v6-u-text-color-required" aria-hidden="true">
            {' *'}
          </span>
          <Popover
            aria-label="Target column help"
            headerContent="Target column"
            bodyContent="Name of the column containing the numeric values to forecast (the time series values)."
          >
            <DashboardPopupIconButton
              icon={<OutlinedQuestionCircleIcon />}
              aria-label="More info for target column"
            />
          </Popover>
        </div>
        <LoadingFormField loading={isLoadingColumns || isFetchingColumns}>
          <Controller
            control={control}
            name="target"
            render={({ field }) => (
              <Select
                id="target-select"
                isOpen={isTargetOpen}
                onOpenChange={setIsTargetOpen}
                onSelect={(_event, value) => {
                  if (typeof value === 'string') {
                    clearColumnFromOtherFields(value, 'target');
                    field.onChange(value);
                  }
                  setIsTargetOpen(false);
                }}
                selected={field.value}
                maxMenuHeight="200px"
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsTargetOpen((prev) => !prev)}
                    isExpanded={isTargetOpen}
                    isDisabled={
                      !isFileSelected || columns.length === 0 || !!columnsError || formIsSubmitting
                    }
                    isFullWidth
                    data-testid="target-select"
                    status={columnsError ? 'danger' : undefined}
                  >
                    {field.value || 'Select a column'}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  {columns.map((column) => (
                    <SelectOption key={column.name} value={column.name}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          display: 'inline-block',
                          width: '4rem',
                          marginRight: '0.5rem',
                        }}
                      >
                        {getTypeAcronym(column.type)}
                      </span>
                      {column.name}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            )}
          />
          {columnsError && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="error">{columnsError.message}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
        </LoadingFormField>
      </StackItem>

      <StackItem>
        <div className="pf-v6-u-font-weight-bold pf-v6-u-font-size-sm pf-v6-u-mb-sm">
          Timestamp column
          <span className="pf-v6-u-text-color-required" aria-hidden="true">
            {' *'}
          </span>
          <Popover
            aria-label="Timestamp column help"
            headerContent="Timestamp column"
            bodyContent="Name of the column containing the timestamp/datetime for each observation."
          >
            <DashboardPopupIconButton
              icon={<OutlinedQuestionCircleIcon />}
              aria-label="More info for timestamp column"
            />
          </Popover>
        </div>
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
                      !isFileSelected || columns.length === 0 || !!columnsError || formIsSubmitting
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
                      // FYI - Technically this field should only support timestamp cols but
                      // since our type is an estimation, we should leave this open for now
                      // isDisabled={column.type !== 'timestamp'}
                    >
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          display: 'inline-block',
                          width: '4rem',
                          marginRight: '0.5rem',
                        }}
                      >
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
      </StackItem>

      <StackItem>
        <div className="pf-v6-u-font-weight-bold pf-v6-u-font-size-sm pf-v6-u-mb-sm">
          ID column
          <Popover
            aria-label="ID column help"
            headerContent="ID column"
            bodyContent="Name of the column that identifies each time series (e.g. product_id, store_id)."
          >
            <DashboardPopupIconButton
              icon={<OutlinedQuestionCircleIcon />}
              aria-label="More info for ID column"
            />
          </Popover>
        </div>
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
                      !isFileSelected || columns.length === 0 || !!columnsError || formIsSubmitting
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
                    <SelectOption key={column.name} value={column.name}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          display: 'inline-block',
                          width: '4rem',
                          marginRight: '0.5rem',
                        }}
                      >
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
      </StackItem>

      <StackItem>
        <div className="pf-v6-u-font-weight-bold pf-v6-u-font-size-sm pf-v6-u-mb-sm">
          Known covariates
          <Popover
            aria-label="Known covariates help"
            headerContent="Known covariates"
            bodyContent="Column names that are known in advance for all steps in the forecast horizon (e.g. holidays, promotions)."
          >
            <DashboardPopupIconButton
              icon={<OutlinedQuestionCircleIcon />}
              aria-label="More info for known covariates"
            />
          </Popover>
        </div>
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
                      !isFileSelected || columns.length === 0 || !!columnsError || formIsSubmitting
                    }
                    isFullWidth
                    data-testid="known_covariates_names-select"
                    status={columnsError ? 'danger' : undefined}
                  >
                    {field.value && field.value.length > 0
                      ? `${field.value.length} column${field.value.length > 1 ? 's' : ''} selected`
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
                    >
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          display: 'inline-block',
                          width: '4rem',
                          marginRight: '0.5rem',
                        }}
                      >
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
      </StackItem>

      <StackItem>
        <div className="pf-v6-u-font-weight-bold pf-v6-u-font-size-sm pf-v6-u-mb-sm">
          Prediction length
          <Popover
            aria-label="Prediction length help"
            headerContent="Prediction length"
            bodyContent="Number of time steps to forecast (horizon length). Required for training and evaluation."
          >
            <DashboardPopupIconButton
              icon={<OutlinedQuestionCircleIcon />}
              aria-label="More info for prediction length"
            />
          </Popover>
        </div>
        <Controller
          control={control}
          name="prediction_length"
          render={({ field, fieldState }) => (
            <>
              <NumberInput
                id="prediction-length-input"
                value={field.value}
                min={1}
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
      </StackItem>
    </Stack>
  );
}

export default ConfigureTimeseriesForm;
