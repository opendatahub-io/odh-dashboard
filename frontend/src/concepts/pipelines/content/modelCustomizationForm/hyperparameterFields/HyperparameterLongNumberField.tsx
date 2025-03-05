import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
} from '@patternfly/react-core';
import * as React from 'react';
import { HyperparameterFields } from '~/pages/pipelines/global/modelCustomization/const';

type HyperparameterLongNumberFieldProps = {
  onChange: (hyperparameter: HyperparameterFields, hyperparameterValue: number) => void;
  label: string;
  field: HyperparameterFields;
  value: number | undefined;
  description: string | undefined;
  isRequired?: boolean;
};

const HyperparameterLongNumberField: React.FC<HyperparameterLongNumberFieldProps> = ({
  onChange,
  label,
  field,
  value,
  description,
  isRequired = true,
}) => {
  const [numberValue, setNumberValue] = React.useState<string | undefined>(
    typeof value !== 'undefined' ? value.toExponential() : undefined,
  );
  React.useEffect(() => {
    if (typeof value === 'undefined') {
      setNumberValue(undefined);
    } else if (value > 0) {
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
          if (typeof numberValue !== 'undefined' && !Number.isNaN(parseFloat(numberValue))) {
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
      {typeof description !== 'undefined' && (
        <FormHelperText data-testid={`${label}-helper-text`}>
          <HelperText>
            <HelperTextItem>{description}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </FormGroup>
  );
};

export default HyperparameterLongNumberField;
