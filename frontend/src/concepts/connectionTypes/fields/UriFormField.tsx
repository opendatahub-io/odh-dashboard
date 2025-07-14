import * as React from 'react';
import {
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { UriField } from '#~/concepts/connectionTypes/types';
import { FieldProps } from '#~/concepts/connectionTypes/fields/types';
import DefaultValueTextRenderer from '#~/concepts/connectionTypes/fields/DefaultValueTextRenderer';
import { trimInputOnBlur, trimInputOnPaste } from '#~/concepts/connectionTypes/utils';

const validateUrl = (url?: string) => {
  if (!url) {
    return true;
  }
  try {
    return !!new URL(url);
  } catch (e) {
    return false;
  }
};

const UriFormField: React.FC<FieldProps<UriField>> = ({
  id,
  field,
  mode,
  onChange,
  value,
  onValidate,
  'data-testid': dataTestId,
}) => {
  const isPreview = mode === 'preview';
  const [isValid, setIsValid] = React.useState(() => validateUrl(value));
  React.useEffect(() => {
    onValidate?.(!isValid, value);
    // do not run when callback changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid]);

  return (
    <DefaultValueTextRenderer id={id} field={field} mode={mode}>
      <TextInput
        aria-readonly={isPreview}
        autoComplete="off"
        isRequired={field.required}
        id={id}
        name={id}
        data-testid={dataTestId}
        value={(isPreview ? field.properties.defaultValue : value) ?? ''}
        onChange={
          isPreview || !onChange
            ? undefined
            : (_e, v) => {
                onChange(v);
                if (!isValid) {
                  setIsValid(validateUrl(v));
                }
              }
        }
        validated={isValid ? ValidatedOptions.default : ValidatedOptions.error}
        onBlur={(e) => {
          trimInputOnBlur(value, onChange)(e);
          setIsValid(validateUrl(value));
        }}
        onPaste={(e) => trimInputOnPaste(value, onChange)(e)}
      />
      {!isValid && (
        <FormHelperText>
          <HelperText data-testid="uri-form-field-helper-text">
            <HelperTextItem icon={<ExclamationCircleIcon />} variant={ValidatedOptions.error}>
              Invalid URI
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </DefaultValueTextRenderer>
  );
};

export default UriFormField;
