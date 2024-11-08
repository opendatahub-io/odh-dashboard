import * as React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  FormGroup,
  GenerateId,
  Popover,
} from '@patternfly/react-core';
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
          <Popover
            headerContent="Field details"
            bodyContent={
              <DescriptionList isCompact>
                <DescriptionListGroup>
                  <DescriptionListTerm>Environment variable</DescriptionListTerm>
                  <DescriptionListDescription>{field.envVar}</DescriptionListDescription>
                </DescriptionListGroup>
                {field.description ? (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Description</DescriptionListTerm>
                    <DescriptionListDescription>{field.description}</DescriptionListDescription>
                  </DescriptionListGroup>
                ) : null}
              </DescriptionList>
            }
          >
            <DashboardPopupIconButton
              icon={<OutlinedQuestionCircleIcon />}
              aria-label="More info"
            />
          </Popover>
        }
      >
        {children(id)}
      </FormGroup>
    )}
  </GenerateId>
);

export default DataFormFieldGroup;
