import * as React from 'react';
import { FormGroup, FormHelperText, HelperText, HelperTextItem } from '@patternfly/react-core';
import MemoryField from '~/components/MemoryField';
import CPUField from '~/components/CPUField';
import NumberInputWrapper from '~/components/NumberInputWrapper';

type CountFormFieldProps = {
  label: string;
  fieldId: string;
  size: number | string;
  setSize: (value: number | string) => void;
  identifier: string;
  errorMessage?: string;
  isValid?: boolean;
};

const CountFormField: React.FC<CountFormFieldProps> = ({
  label,
  fieldId,
  size,
  setSize,
  identifier,
  errorMessage,
  isValid = true,
}) => {
  const renderInputField = () => {
    switch (identifier) {
      case 'cpu':
        return <CPUField onChange={(value) => setSize(value)} value={size} />;
      case 'memory':
        return <MemoryField onChange={(value) => setSize(value)} value={String(size)} />;
      default:
        return (
          <NumberInputWrapper
            min={0}
            value={Number(size)}
            onChange={(value) => {
              if (value) {
                setSize(value);
              }
            }}
          />
        );
    }
  };

  return (
    <FormGroup label={label} fieldId={fieldId} data-testid={`node-resource-size-${fieldId}`}>
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
