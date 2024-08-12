import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { Label, Switch, Text, TextContent, Truncate } from '@patternfly/react-core';
import { ConnectionTypeField, ConnectionTypeFieldType } from '~/concepts/connectionTypes/types';
import { defaultValueToString, fieldTypeToString } from '~/concepts/connectionTypes/utils';

type CreateConnectionTypeFieldsTableRowProps = {
  row: ConnectionTypeField;
  columns: string[];
};

export const CreateConnectionTypeFieldsTableRow: React.FC<
  CreateConnectionTypeFieldsTableRowProps
> = ({ row, columns }) => {
  if (row.type === ConnectionTypeFieldType.Section) {
    return (
      <Tr id={row.name} isStriped data-testid="row">
        <Td dataLabel={columns[0]} colSpan={5} data-testid="field-name">
          {row.name}{' '}
          <Label color="blue" data-testid="section-heading">
            Section heading
          </Label>
          <TextContent>
            <Text className="pf-v5-u-color-200">{row.description}</Text>
          </TextContent>
        </Td>
      </Tr>
    );
  }

  // TODO: support row.required toggle
  return (
    <Tr id={row.name} data-testid="row">
      <Td dataLabel={columns[0]} data-testid="field-name">
        {row.name}
        <TextContent>
          <Text className="pf-v5-u-color-200">
            <Truncate content={row.description ?? ''} />
          </Text>
        </TextContent>
      </Td>
      <Td dataLabel={columns[1]} data-testid="field-type">
        {fieldTypeToString(row)}
      </Td>
      <Td dataLabel={columns[2]} data-testid="field-default">
        {defaultValueToString(row) || '-'}
      </Td>
      <Td dataLabel={columns[3]} data-testid="field-env">
        {row.envVar || '-'}
      </Td>
      <Td dataLabel={columns[4]}>
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
