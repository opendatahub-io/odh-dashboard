import * as React from 'react';
import { FormGroup, FormHelperText, HelperText, HelperTextItem } from '@patternfly/react-core';
import MemoryField from '#~/components/MemoryField';
import CPUField from '#~/components/CPUField';
import NumberInputWrapper from '#~/components/NumberInputWrapper';
import { IdentifierResourceType } from '#~/types';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip';

type CountFormFieldProps = {
  label?: string;
  fieldId: string;
  size: number | string;
  setSize: (value: number | string) => void;
  type?: IdentifierResourceType;
  errorMessage?: string;
  isValid?: boolean;
  tooltip?: string;
  isRequired?: boolean;
};

const CountFormField: React.FC<CountFormFieldProps> = ({
  label,
  fieldId,
  size,
  setSize,
  type,
  errorMessage,
  isValid = true,
  tooltip,
  isRequired,
}) => {
  const renderInputField = () => {
    const validated = isValid ? 'default' : 'error';
    switch (type) {
      case IdentifierResourceType.CPU:
        return (
          <CPUField
            validated={validated}
            onChange={(value) => setSize(value ?? '1')}
            value={size}
            min={0}
          />
        );
      case IdentifierResourceType.MEMORY:
        return (
          <MemoryField
            validated={validated}
            onChange={(value) => setSize(value ?? '1Gi')}
            value={size}
            min={0}
          />
        );
      default:
        return (
          <NumberInputWrapper
            validated={validated}
            min={0}
            value={Number(size)}
            // If value is undefined, we cannot set it to empty string
            // Because Number('') will be 0, then the field cannot be cleared
            onChange={(value) => setSize(value ?? Number.NaN.toString())}
          />
        );
    }
  };

  return (
    <FormGroup
      label={label}
      fieldId={fieldId}
      data-testid={`node-resource-size-${fieldId}`}
      labelHelp={tooltip ? <DashboardHelpTooltip content={tooltip} /> : undefined}
      isRequired={isRequired}
    >
      {renderInputField()}
      {!isValid && errorMessage && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem data-testid={`node-resource-size-${fieldId}-error`} variant="error">
              {errorMessage}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </FormGroup>
  );
};

export default CountFormField;
