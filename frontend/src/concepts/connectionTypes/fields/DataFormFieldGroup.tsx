import * as React from 'react';
import { FormGroup, GenerateId, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ConnectionTypeDataField } from '~/concepts/connectionTypes/types';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';

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
        labelIcon={
          field.description ? (
            <Popover bodyContent={field.description}>
              <DashboardPopupIconButton
                icon={<OutlinedQuestionCircleIcon />}
                aria-label="More info"
              />
            </Popover>
          ) : undefined
        }
      >
        {children(id)}
      </FormGroup>
    )}
  </GenerateId>
);

export default DataFormFieldGroup;
