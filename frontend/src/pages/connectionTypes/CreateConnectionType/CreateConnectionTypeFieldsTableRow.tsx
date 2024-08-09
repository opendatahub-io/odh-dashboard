import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { Label, Switch, Text, TextVariants } from '@patternfly/react-core';
import { ConnectionTypeField, ConnectionTypeFieldType } from '~/concepts/connectionTypes/types';
import { defaultValueToString, fieldTypeToString } from '~/concepts/connectionTypes/utils';

type CreateConnectionTypeFieldsTableRowProps = {
  row: ConnectionTypeField;
};

export const CreateConnectionTypeFieldsTableRow: React.FC<
  CreateConnectionTypeFieldsTableRowProps
> = ({ row }) => {
  if (row.type === ConnectionTypeFieldType.Section) {
    return (
      <Tr id={row.name} isStriped data-testid="row">
        <Td data-testid="field-name">
          <Text component={TextVariants.p}>
            {row.name}{' '}
            <Label color="blue" data-testid="section-heading">
              Section heading
            </Label>
          </Text>
          <Text component={TextVariants.small}>{row.description}</Text>
        </Td>
        <Td />
        <Td />
        <Td />
        <Td />
      </Tr>
    );
  }
  return (
    <Tr id={row.name} data-testid="row">
      <Td data-testid="field-name">
        <Text component={TextVariants.p}>{row.name}</Text>
        <Text component={TextVariants.small}>{row.description}</Text>
      </Td>
      <Td data-testid="field-type">{fieldTypeToString(row)}</Td>
      <Td data-testid="field-default">{defaultValueToString(row) || '-'}</Td>
      <Td data-testid="field-env">{row.envVar || '-'}</Td>
      <Td>
        <Switch
          aria-label="switch"
          isChecked={row.required}
          isDisabled
          data-testid="field-required"
        />
      </Td>
    </Tr>
  );
};
