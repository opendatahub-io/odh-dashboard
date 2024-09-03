import * as React from 'react';
import {
  FormHelperText,
  HelperText,
  HelperTextItem,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { NumericField } from '~/concepts/connectionTypes/types';
import NumberInputWrapper from '~/components/NumberInputWrapper';
import { FieldProps } from '~/concepts/connectionTypes/fields/types';
import DefaultValueTextRenderer from '~/concepts/connectionTypes/fields/DefaultValueTextRenderer';

const rangeString = (min?: number, max?: number) => {
  if (min === undefined && max === undefined) {
    return '';
  }
  if (min === undefined) {
    return `(less than or equal to ${max})`;
  }
  if (max === undefined) {
    return `(greater than or equal to ${min})`;
  }
  return `(${min}-${max})`;
};

const NumericFormField: React.FC<FieldProps<NumericField>> = ({
  id,
  field,
  mode,
  onChange,
  onValidate,
  value,
  'data-testid': dataTestId,
}) => {
  const isPreview = mode === 'preview';
  const isDefault = mode === 'default';
  const currentValue = isPreview ? field.properties.defaultValue : value;

  const validationError = React.useMemo(() => {
    if (currentValue === undefined) {
      return null;
    }

    if (
      currentValue < (field.properties.min ?? Number.NEGATIVE_INFINITY) ||
      currentValue > (field.properties.max ?? Number.POSITIVE_INFINITY)
    ) {
      return `${field.name || 'Value'} is outside the valid range ${rangeString(
        field.properties.min,
        field.properties.max,
      )}`;
    }
    return null;
  }, [currentValue, field.properties.min, field.properties.max, field.name]);

  // do not run when callback changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => onValidate && onValidate(!validationError), [validationError]);

  return (
    <DefaultValueTextRenderer id={id} field={field} mode={mode}>
      <NumberInputWrapper
        inputProps={{
          'aria-readonly': isPreview,
          id,
          'data-testid': dataTestId,
          placeholder: `${isDefault ? '' : currentValue ?? ''}`,
        }}
        inputName={id}
        value={currentValue ?? ''}
        min={field.properties.min}
        max={field.properties.max}
        unit={field.properties.unit}
        validated={validationError ? ValidatedOptions.error : ValidatedOptions.default}
        // NumberInput shows a disabled input if no onChange provided
        onChange={
          isPreview || !onChange
            ? () => undefined
            : (newValue) => onChange(Number.isNaN(newValue) ? undefined : newValue)
        }
        intOnly={false}
        fullWidth
      />
      {validationError ? (
        <FormHelperText>
          <HelperText>
            <HelperTextItem icon={<ExclamationCircleIcon />} variant="error">
              {validationError}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      ) : null}
    </DefaultValueTextRenderer>
  );
};

export default NumericFormField;
