import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Radio,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import * as React from 'react';
import { HyperparameterFields } from '~/pages/pipelines/global/modelCustomization/const';
import HyperparameterNumericField from './HyperparameterNumericField';

type HyperparameterEvaluationFieldProps = {
  onChange: (hyperparameter: HyperparameterFields, hyperparameterValue: string | number) => void;
  label: string;
  field: HyperparameterFields;
  value: string | number | undefined;
  description: string | undefined;
  isRequired?: boolean;
};

const HyperparameterEvaluationField: React.FC<HyperparameterEvaluationFieldProps> = ({
  onChange,
  label,
  field,
  value,
  description,
  isRequired = true,
}) => {
  const onExactNumberInput = (
    hyperparameter: HyperparameterFields,
    hyperparameterValue: number | string,
  ) => {
    onChange(hyperparameter, hyperparameterValue.toString());
    setDirtyNumberValue(
      typeof hyperparameterValue === 'number' ? hyperparameterValue : Number(hyperparameterValue),
    );
  };
  const [dirtyNumberValue, setDirtyNumberValue] = React.useState(
    !Number.isNaN(Number(value)) ? Number(value) : 1,
  );

  return (
    <FormGroup label={label} isRequired={isRequired}>
      <Stack hasGutter>
        <StackItem>
          <Radio
            id={`${label}-radio-auto`}
            label="Auto"
            name={`${label}-radio-auto`}
            isChecked={value === 'auto'}
            onChange={() => {
              onChange(field, 'auto');
            }}
            data-testid={`${field}-auto-evaluation-field`}
          />
        </StackItem>
        <StackItem>
          <Radio
            id={`${label}-radio-exact-number`}
            label="Exact number"
            name={`${label}-radio-exact-number`}
            isChecked={!Number.isNaN(Number(value))}
            onChange={() => {
              onChange(field, dirtyNumberValue.toString());
            }}
            body={
              <HyperparameterNumericField
                label={label}
                onChange={onExactNumberInput}
                field={field}
                value={!Number.isNaN(Number(value)) ? Number(value) : dirtyNumberValue}
                isRequired={false}
                description={undefined}
                isDisabled={value === 'auto'}
                isInt
              />
            }
            data-testid={`${field}-exact-evaluation-field`}
          />
          {typeof description !== 'undefined' && (
            <FormHelperText data-testid={`${label}-helper-text`}>
              <HelperText>
                <HelperTextItem>{description}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
        </StackItem>
      </Stack>
    </FormGroup>
  );
};

export default HyperparameterEvaluationField;
