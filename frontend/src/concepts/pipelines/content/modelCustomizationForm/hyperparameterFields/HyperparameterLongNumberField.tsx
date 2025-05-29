import { debounce, FormGroup, TextInput } from '@patternfly/react-core';
import * as React from 'react';
import { ZodIssue } from 'zod';
import { ZodErrorHelperText } from '#~/components/ZodErrorFormHelperText';
import { RuntimeConfigParamValue } from '#~/concepts/pipelines/kfTypes';

type HyperparameterLongNumberFieldProps = {
  onChange: (hyperparameter: string, hyperparameterValue?: RuntimeConfigParamValue) => void;
  label: string;
  field: string;
  value?: RuntimeConfigParamValue;
  description?: string;
  isRequired?: boolean;
  validationIssues?: ZodIssue[];
  onBlur?: () => void;
};

const HyperparameterLongNumberField: React.FC<HyperparameterLongNumberFieldProps> = ({
  onChange,
  label,
  field,
  value,
  description,
  isRequired = true,
  validationIssues = [],
  onBlur,
}) => {
  const formatNumber = React.useCallback((num?: RuntimeConfigParamValue): string => {
    if (num === undefined) {
      return '';
    }
    if (
      typeof num === 'number' &&
      (Math.abs(num) >= 10000 || (num !== 0 && Math.abs(num) < 0.001))
    ) {
      return num.toExponential();
    }
    return String(num);
  }, []);

  const [displayValue, setDisplayValue] = React.useState<string>(formatNumber(value));

  const zodIssues = value !== undefined ? validationIssues : [];

  const handleNumberChange = (val: string) => {
    setDisplayValue(val);
    debouncedOnChange(val);
  };

  const handleUnknownValue = React.useCallback(
    (val: string, format?: boolean) => {
      if (val === '') {
        onChange(field, undefined);
        return;
      }

      if (val === '' || !Number.isNaN(Number(val))) {
        const num = Number(val);
        onChange(field, num);

        setDisplayValue(format ? formatNumber(num) : val);
      } else {
        onChange(field, val);
      }
    },
    [field, onChange, formatNumber],
  );

  const debouncedOnChange = React.useMemo(
    () =>
      debounce((val: string) => {
        handleUnknownValue(val);
      }, 500),
    [handleUnknownValue],
  );

  const handleBlur = () => {
    if (onBlur) {
      onBlur();
    }
    handleUnknownValue(displayValue, true);
  };

  return (
    <FormGroup isRequired={isRequired} label={label}>
      <TextInput
        aria-readonly={!onChange}
        data-testid={`${field}-long-number-field`}
        id={`${field}-name`}
        name={`${label}-name`}
        isRequired
        value={displayValue}
        onChange={(_, val) => handleNumberChange(val)}
        onBlur={handleBlur}
        validated={zodIssues.length > 0 ? 'error' : 'default'}
      />
      <ZodErrorHelperText
        zodIssue={zodIssues}
        description={description}
        data-testid={`${label}-helper-text`}
      />
    </FormGroup>
  );
};

export default HyperparameterLongNumberField;
