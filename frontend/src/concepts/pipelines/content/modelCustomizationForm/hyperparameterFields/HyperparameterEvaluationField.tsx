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
import { ZodIssue } from 'zod';
import { ZodErrorHelperText } from '#~/components/ZodErrorFormHelperText';
import { NumberInputParam } from '#~/concepts/pipelines/content/createRun/contentSections/ParamsSection/NumberInputParam';

type HyperparameterEvaluationFieldProps = {
  onChange: (hyperparameter: string, hyperparameterValue: string | number) => void;
  label: string;
  field: string;
  value?: string | number;
  description?: string;
  isRequired?: boolean;
  validationIssues?: ZodIssue[];
};

const HyperparameterEvaluationField: React.FC<HyperparameterEvaluationFieldProps> = ({
  onChange,
  label,
  field,
  value,
  description,
  isRequired = true,
  validationIssues,
}) => {
  const onExactNumberInput = (hyperparameter: string, hyperparameterValue: number | string) => {
    onChange(hyperparameter, hyperparameterValue.toString());
    setDirtyNumberValue(
      typeof hyperparameterValue === 'number' ? hyperparameterValue : Number(hyperparameterValue),
    );
  };
  const [dirtyNumberValue, setDirtyNumberValue] = React.useState(
    !Number.isNaN(Number(value)) ? Number(value) : 1,
  );
  const zodIssues = value !== undefined ? validationIssues : [];

  const inputProps = {
    value: !Number.isNaN(Number(value)) ? Number(value) : dirtyNumberValue,
    id: field,
    name: label,
    onChange: (
      _event: React.ChangeEvent<unknown> | null,
      hyperparameterValue: string | number | boolean,
    ) => {
      if (typeof hyperparameterValue === 'number') {
        onExactNumberInput(field, hyperparameterValue);
      }
    },
  };

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
            body={<NumberInputParam {...inputProps} isDisabled={value === 'auto'} />}
            data-testid={`${field}-exact-evaluation-field`}
          />
          {description && (
            <FormHelperText data-testid={`${label}-helper-text`}>
              <HelperText>
                <HelperTextItem>{description}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
        </StackItem>
      </Stack>
      <ZodErrorHelperText zodIssue={zodIssues} />
    </FormGroup>
  );
};

export default HyperparameterEvaluationField;
