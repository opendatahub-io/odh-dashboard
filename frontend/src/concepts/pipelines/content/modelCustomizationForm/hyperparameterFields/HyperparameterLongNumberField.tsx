import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
} from '@patternfly/react-core';
import * as React from 'react';
import { HyperparameterDisplayFields } from '~/pages/pipelines/global/modelCustomization/const';

type HyperparameterLongNumberFieldProps = {
  onChange: (
    hyperparameter: HyperparameterDisplayFields,
    hyperparameterValue: number | undefined,
  ) => void;
  label: string;
  field: HyperparameterDisplayFields;
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
    value ? value.toString() : undefined,
  );
  // React.useEffect(() => {
  //   if (value) {
  //     setNumberValue(value.toString());
  //   } else {
  //     setNumberValue(undefined);
  //   }
  // }, [value]);

  return (
    <FormGroup isRequired={isRequired} label={label}>
      <TextInput
        aria-readonly={!onChange}
        data-testid={`${field}-long-number-field`}
        id={`${field}-name`}
        name={`${label}-name`}
        isRequired
        value={numberValue ?? ''}
        onBlur={() => {
          if (numberValue && !Number.isNaN(parseFloat(numberValue))) {
            onChange(field, parseFloat(numberValue));
          }
        }}
        onChange={(_, val) => {
          if (!Number.isNaN(parseFloat(val))) {
            setNumberValue(val);
            if (!val.includes('e')) {
              onChange(field, parseFloat(val));
            }
          } else if (val === '') {
            setNumberValue(undefined);
            onChange(field, undefined);
          }
        }}
      />
      {description && (
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
