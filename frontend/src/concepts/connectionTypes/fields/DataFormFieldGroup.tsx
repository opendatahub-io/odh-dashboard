import * as React from 'react';
import { FormGroup } from '@patternfly/react-core';
import { ConnectionTypeDataField } from '~/concepts/connectionTypes/types';
import FormGroupText from '~/components/FormGroupText';
import UnspecifiedValue from '~/concepts/connectionTypes/fields/UnspecifiedValue';
import { defaultValueToString } from '~/concepts/connectionTypes/utils';

type Props<T extends ConnectionTypeDataField> = {
  field: T;
  isPreview: boolean;
  children: (id: string) => React.ReactNode;
  renderDefaultValue?: boolean;
};

const DataFormFieldGroup = <T extends ConnectionTypeDataField>({
  field,
  isPreview,
  children,
  renderDefaultValue = true,
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
    </FormGroup>
  );
};

export default DataFormFieldGroup;
