import * as React from 'react';
import {
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { UriField } from '~/concepts/connectionTypes/types';
import { FieldProps } from '~/concepts/connectionTypes/fields/types';
import DefaultValueTextRenderer from '~/concepts/connectionTypes/fields/DefaultValueTextRenderer';
import { joinWithCommaAnd } from '~/utilities/string';

const validateUrl = (url?: string, supportedSchemes?: string[]) => {
  if (!url) {
    return true;
  }
  try {
    if (
      supportedSchemes?.length &&
      !supportedSchemes.some((scheme) => url.toLowerCase().startsWith(scheme.toLowerCase()))
    ) {
      return false;
    }
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
  const supportedSchemes = field.properties.schemes ?? [];
  const [isValid, setIsValid] = React.useState(() => validateUrl(value, supportedSchemes));

  React.useEffect(() => {
    onValidate?.(isValid);
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
                  setIsValid(validateUrl(v, supportedSchemes));
                }
              }
        }
        validated={isValid ? ValidatedOptions.default : ValidatedOptions.error}
        onBlur={() => {
          setIsValid(validateUrl(value, supportedSchemes));
        }}
      />
      {!isValid && (
        <FormHelperText>
          <HelperText data-testid="uri-form-field-helper-text">
            <HelperTextItem icon={<ExclamationCircleIcon />} variant={ValidatedOptions.error}>
              {supportedSchemes.length
                ? `URI must start with ${joinWithCommaAnd(supportedSchemes, undefined, 'or')}`
                : 'Invalid URI'}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </DefaultValueTextRenderer>
  );
};

export default UriFormField;
