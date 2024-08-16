import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Button, Label, Switch, Truncate } from '@patternfly/react-core';
import {
  ConnectionTypeField,
  ConnectionTypeFieldType,
  SectionField,
} from '~/concepts/connectionTypes/types';
import { defaultValueToString, fieldTypeToString } from '~/concepts/connectionTypes/utils';
import { Row } from '~/utilities/useDraggableTableControlled';

type Props = {
  row: Row<ConnectionTypeField>;
  columns: string[];
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: (field: ConnectionTypeField) => void;
  onAddField: (parentSection: SectionField) => void;
  onChange: (updatedField: ConnectionTypeField) => void;
};

const ManageConnectionTypeFieldsTableRow: React.FC<Props> = ({
  row,
  columns,
  onEdit,
  onDelete,
  onDuplicate,
  onAddField,
  onChange,
  ...props
}) => {
  if (row.type === ConnectionTypeFieldType.Section) {
    return (
      <Tr id={row.id} draggable isStriped data-testid="row" {...props}>
        <Td
          draggableRow={{
            id: `draggable-row-${row.id}`,
          }}
        />
        <Td dataLabel={columns[0]} colSpan={5} data-testid="field-name">
          {row.name}{' '}
          <Label color="blue" data-testid="section-heading">
            Section heading
          </Label>
          <div className="pf-v5-u-color-200">
            <Truncate content={row.description ?? ''} />
          </div>
        </Td>
        <Td isActionCell modifier="nowrap">
          <Button variant="secondary" onClick={() => onAddField(row)}>
            Add field
          </Button>
          <ActionsColumn
            items={[
              {
                title: 'Edit',
                onClick: () => onEdit(),
              },
              {
                title: 'Duplicate',
                onClick: () => onDuplicate({ ...row, name: `Duplicate of ${row.name}` }),
              },
              {
                title: 'Delete',
                onClick: () => onDelete(),
              },
            ]}
          />
        </Td>
      </Tr>
    );
  }

  return (
    <Tr id={row.id} draggable data-testid="row" {...props}>
      <Td
        draggableRow={{
          id: `draggable-row-${row.id}`,
        }}
      />
      <Td dataLabel={columns[0]} data-testid="field-name">
        {row.name}
        <div className="pf-v5-u-color-200">
          <Truncate content={row.description ?? ''} />
        </div>
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
          aria-label="toggle field required"
          isChecked={row.required || false}
          data-testid="field-required"
          onChange={() => onChange({ ...row, required: !row.required })}
        />
      </Td>
      <Td isActionCell>
        <ActionsColumn
          items={[
            {
              title: 'Edit',
              onClick: () => onEdit(),
            },
            {
              title: 'Duplicate',
              onClick: () => onDuplicate(row),
            },
            {
              title: 'Delete',
              onClick: () => onDelete(),
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default ManageConnectionTypeFieldsTableRow;
