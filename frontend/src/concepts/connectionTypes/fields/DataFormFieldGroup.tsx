import * as React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  FormGroup,
  Popover,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ConnectionTypeDataField } from '#~/concepts/connectionTypes/types';
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';

type Props = {
  field: ConnectionTypeDataField;
  id: string;
  children: React.ReactNode;
};

const DataFormFieldGroup: React.FC<Props> = ({ field, id, children }): React.ReactNode => (
  <FormGroup
    label={field.name}
    fieldId={id}
    data-testid={`field-group ${field.type} ${field.envVar}`}
    // do not mark read only fields as required
    isRequired={field.required && !field.properties.defaultReadOnly}
    labelHelp={
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
        <DashboardPopupIconButton icon={<OutlinedQuestionCircleIcon />} aria-label="More info" />
      </Popover>
    }
  >
    {children}
  </FormGroup>
);

export default DataFormFieldGroup;
