import * as React from 'react';
import { FormGroup, GenerateId } from '@patternfly/react-core';
import { ConnectionTypeDataField } from '~/concepts/connectionTypes/types';

type Props = {
  field: ConnectionTypeDataField;
  children: (id: string) => React.ReactNode;
};

const DataFormFieldGroup: React.FC<Props> = ({ field, children }): React.ReactNode => (
  <GenerateId>
    {(id) => (
      <FormGroup
        label={field.name}
        fieldId={id}
        data-testid={`field ${field.type} ${field.envVar}`}
        // do not mark read only fields as required
        isRequired={field.required && !field.properties.defaultReadOnly}
      >
        {children(id)}
      </FormGroup>
    )}
  </GenerateId>
);

export default DataFormFieldGroup;
