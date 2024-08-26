import * as React from 'react';
import { ActionsColumn, Td, ThProps, Tr } from '@patternfly/react-table';
import { Button, Label, Switch } from '@patternfly/react-core';
import {
  ConnectionTypeField,
  ConnectionTypeFieldType,
  SectionField,
} from '~/concepts/connectionTypes/types';
import { defaultValueToString, fieldTypeToString } from '~/concepts/connectionTypes/utils';
import type { RowProps } from '~/utilities/useDraggableTableControlled';
import TruncatedText from '~/components/TruncatedText';

type Props = {
  row: ConnectionTypeField;
  columns: ThProps[];
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: (field: ConnectionTypeField) => void;
  onAddField: (parentSection: SectionField) => void;
  onChange: (updatedField: ConnectionTypeField) => void;
} & RowProps;

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
      <Tr draggable isStriped data-testid="row" {...props}>
        <Td
          draggableRow={{
            id: `draggable-row-${props.id}`,
          }}
        />
        <Td dataLabel={columns[0].label} data-testid="field-name">
          <div>
            {row.name}{' '}
            <Label color="blue" data-testid="section-heading">
              Section heading
            </Label>
            <div className="pf-v5-u-color-200">
              <TruncatedText content={row.description ?? ''} maxLines={2} />
            </div>
          </div>
        </Td>
        <Td colSpan={4} />
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
    <Tr draggable data-testid="row" {...props}>
      <Td
        draggableRow={{
          id: `draggable-row-${props.id}`,
        }}
      />
      <Td dataLabel={columns[0].label} data-testid="field-name">
        <div>
          {row.name}
          <div className="pf-v5-u-color-200">
            <TruncatedText content={row.description ?? ''} maxLines={2} />
          </div>
        </div>
      </Td>
      <Td dataLabel={columns[1].label} data-testid="field-type">
        {fieldTypeToString(row.type)}
      </Td>
      <Td dataLabel={columns[2].label} data-testid="field-default" modifier="truncate">
        {defaultValueToString(row) || '-'}
      </Td>
      <Td dataLabel={columns[3].label} data-testid="field-env">
        {row.envVar || '-'}
      </Td>
      <Td dataLabel={columns[4].label}>
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
