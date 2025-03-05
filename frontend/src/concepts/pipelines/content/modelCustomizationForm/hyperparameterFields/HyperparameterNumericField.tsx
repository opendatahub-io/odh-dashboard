import { FormGroup, FormHelperText, HelperText, HelperTextItem } from '@patternfly/react-core';
import * as React from 'react';
import NumberInputWrapper from '~/components/NumberInputWrapper';
import { HyperparameterFields } from '~/pages/pipelines/global/modelCustomization/const';

type HyperparameterNumericFieldProps = {
  onChange: (hyperparameter: HyperparameterFields, hyperparameterValue: number | string) => void;
  label: string;
  field: HyperparameterFields;
  value: number | string | undefined;
  isInt: boolean;
  description: string | undefined;
  min?: number;
  isRequired?: boolean;
  isDisabled?: boolean;
};

const HyperparameterNumericField: React.FC<HyperparameterNumericFieldProps> = ({
  onChange,
  label,
  field,
  value,
  isInt,
  description,
  min = 0,
  isRequired = true,
  isDisabled = false,
}) => (
  <FormGroup isRequired={isRequired} label={label}>
    <NumberInputWrapper
      min={min}
      value={
        typeof value !== 'undefined'
          ? typeof value === 'number'
            ? value
            : Number(value)
          : undefined
      }
      onChange={(val) => {
        if (val) {
          onChange(field, typeof value === 'number' ? val : val.toString());
        }
      }}
      isDisabled={isDisabled}
      intOnly={isInt}
      data-testid={`${field}-numeric-field`}
    />
    {typeof description !== 'undefined' && (
      <FormHelperText data-testid={`${label}-helper-text`}>
        <HelperText>
          <HelperTextItem>{description}</HelperTextItem>
        </HelperText>
      </FormHelperText>
    )}
  </FormGroup>
);

export default HyperparameterNumericField;
