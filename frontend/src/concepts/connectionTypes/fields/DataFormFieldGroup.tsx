import * as React from 'react';
import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import { ConnectionTypeDataField } from '~/concepts/connectionTypes/types';
import FormGroupText from '~/components/FormGroupText';
import UnspecifiedValue from '~/concepts/connectionTypes/fields/UnspecifiedValue';
import { defaultValueToString } from '~/concepts/connectionTypes/utils';

type Props<T extends ConnectionTypeDataField> = {
  field: T;
  isPreview: boolean;
  children: (id: string) => React.ReactNode;
  renderDefaultValue?: boolean;
  validationError?: string;
};

const DataFormFieldGroup = <T extends ConnectionTypeDataField>({
  field,
  isPreview,
  children,
  renderDefaultValue = true,
  validationError,
}: Props<T>): React.ReactNode => {
  const id = `${field.type}-${field.envVar}`;
  return (
    <FormGroup
      label={field.name}
      fieldId={id}
      data-testid={`field ${field.type} ${field.envVar}`}
      // do not mark read only fields as required
      isRequired={field.required && !field.properties.defaultReadOnly}
    >
      {field.properties.defaultReadOnly && renderDefaultValue ? (
        <FormGroupText id={id}>
          {defaultValueToString(field) ?? (isPreview ? <UnspecifiedValue /> : '-')}
        </FormGroupText>
      ) : (
        children(id)
      )}
      {validationError ? (
        <FormHelperText>
          <HelperText>
            <HelperTextItem icon={<ExclamationCircleIcon />} variant={ValidatedOptions.error}>
              {validationError}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      ) : null}
    </FormGroup>
  );
};

export default DataFormFieldGroup;
