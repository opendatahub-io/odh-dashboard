import * as React from 'react';
import { TextInput } from '@patternfly/react-core';
import { UriField } from '~/concepts/connectionTypes/types';
import DataFormFieldGroup from '~/concepts/connectionTypes/fields/DataFormFieldGroup';

const URI_REGEX = new RegExp(
  '(?:(?:https?|ftp|file)://|www.|ftp.)(?:([-A-Z0-9+&@#/%=~_|$?!:,.]*)|[-A-Z0-9+&@#/%=~_|$?!:,.])*(?:([-A-Z0-9+&@#/%=~_|$?!:,.]*)|[A-Z0-9+&@#/%=~_|$])',
);

type Props = {
  field: UriField;
  isPreview?: boolean;
  value?: string;
  onChange?: (value: string) => void;
};

const checkValidity = (value?: string) => (value ? URI_REGEX.test(value) : true);

const UriFormField: React.FC<Props> = ({ field, isPreview, onChange, value }) => {
  const [valid, setValid] = React.useState<boolean>(
    checkValidity(isPreview ? field.properties.defaultValue : value ?? ''),
  );
  const currentValue = (isPreview ? field.properties.defaultValue : value) ?? '';

  return (
    <DataFormFieldGroup
      field={field}
      isPreview={!!isPreview}
      validationError={!valid ? `Please enter a valid URI` : undefined}
    >
      {(id) => (
        <TextInput
          aria-readonly={isPreview}
          autoComplete="off"
          isRequired={field.required}
          id={id}
          name={id}
          value={currentValue}
          onBlur={() => setValid(checkValidity(currentValue))}
          onChange={
            isPreview || !onChange
              ? undefined
              : (_e, v) => {
                  if (!valid) {
                    setValid(checkValidity(v));
                  }
                  onChange(v);
                }
          }
        />
      )}
    </DataFormFieldGroup>
  );
};

export default UriFormField;
