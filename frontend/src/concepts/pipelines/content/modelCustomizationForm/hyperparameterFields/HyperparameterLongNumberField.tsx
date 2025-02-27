import { FormGroup, TextInput } from '@patternfly/react-core';
import * as React from 'react';
import { HyperparameterFields } from '~/pages/pipelines/global/modelCustomization/const';

type HyperparameterLongNumberFieldProps = {
  onChange: (hyperparameter: HyperparameterFields, hyperparameterValue: number) => void;
  label: string;
  field: HyperparameterFields;
  value: number;
  isRequired?: boolean;
};

const HyperparameterLongNumberField: React.FC<HyperparameterLongNumberFieldProps> = ({
  onChange,
  label,
  field,
  value,
  isRequired = true,
}) => {
  const [numberValue, setNumberValue] = React.useState<string>(value.toExponential());
  React.useEffect(() => {
    if (value > 0) {
      setNumberValue(value.toString());
    }
  }, [value]);

  return (
    <FormGroup isRequired={isRequired} label={label}>
      <TextInput
        aria-readonly={!onChange}
        data-testid={`${label}-long-number-field`}
        id={`${label}-name`}
        name={`${label}-name`}
        isRequired
        value={numberValue}
        onBlur={() => {
          if (!Number.isNaN(parseFloat(numberValue))) {
            setNumberValue(parseFloat(numberValue).toExponential());
          }
        }}
        onChange={(_, val) => {
          if (!Number.isNaN(parseFloat(val))) {
            setNumberValue(val);
            onChange(field, parseFloat(val));
          } else if (val === '') {
            setNumberValue('');
            onChange(field, 0);
          }
        }}
      />
    </FormGroup>
  );
};

export default HyperparameterLongNumberField;
