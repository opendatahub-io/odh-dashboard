import {
  FormHelperText,
  HelperText,
  HelperTextItem,
  MenuToggle,
  Popover,
  Select,
  SelectList,
  SelectOption,
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

interface ConfigureTabularFormProps {
  columns: Column[];
  isLoadingColumns: boolean;
  isFetchingColumns: boolean;
  columnsError: Error | null;
  isFileSelected: boolean;
  formIsSubmitting: boolean;
}

function ConfigureTabularForm({
  columns,
  isLoadingColumns,
  isFetchingColumns,
  columnsError,
  isFileSelected,
  formIsSubmitting,
}: ConfigureTabularFormProps): React.JSX.Element {
  const { control } = useFormContext();
  const [isLabelColumnOpen, setIsLabelColumnOpen] = useState(false);

  return (
    <StackItem>
      <div className="pf-v6-u-font-weight-bold pf-v6-u-font-size-sm pf-v6-u-mb-sm">
        Label column
        <span className="pf-v6-u-text-color-required" aria-hidden="true">
          {' *'}
        </span>
        <Popover
          aria-label="Label column help"
          headerContent="Label column"
          bodyContent="Name of the target/label column in the dataset."
        >
          <DashboardPopupIconButton
            icon={<OutlinedQuestionCircleIcon />}
            aria-label="More info for label column"
          />
        </Popover>
      </div>
      <LoadingFormField loading={isLoadingColumns || isFetchingColumns}>
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
              maxMenuHeight="200px"
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setIsLabelColumnOpen((prev) => !prev)}
                  isExpanded={isLabelColumnOpen}
                  isDisabled={
                    !isFileSelected || columns.length === 0 || !!columnsError || formIsSubmitting
                  }
                  isFullWidth
                  data-testid="label_column-select"
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
  );
}

export default ConfigureTabularForm;
