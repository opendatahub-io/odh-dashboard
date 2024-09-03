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

const URI_REGEX = new RegExp(
  '(?:(?:https?|ftp|file)://|www.|ftp.)(?:([-A-Z0-9+&@#/%=~_|$?!:,.]*)|[-A-Z0-9+&@#/%=~_|$?!:,.])*(?:([-A-Z0-9+&@#/%=~_|$?!:,.]*)|[A-Z0-9+&@#/%=~_|$])',
);

const validateUrl = (url?: string) => {
  try {
    return !url || URI_REGEX.test(url);
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
                  setIsValid(validateUrl(value));
                }
              }
        }
        validated={isValid ? ValidatedOptions.default : ValidatedOptions.error}
        onBlur={() => {
          setIsValid(validateUrl(value));
        }}
      />
      {!isValid && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem icon={<ExclamationCircleIcon />} variant={ValidatedOptions.error}>
              Invalid URL
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </DefaultValueTextRenderer>
  );
};

export default UriFormField;
