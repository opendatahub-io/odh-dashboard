import React from 'react';
import {
  ActionList,
  ActionListItem,
  Bullseye,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateHeader,
  EmptyStateIcon,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { Table, Thead, Tbody, Tr, Th } from '@patternfly/react-table';
import ConnectionTypeFieldModal from '~/pages/connectionTypes/create/ConnectionTypeFieldModal';
import { ConnectionTypeField, ConnectionTypeFieldType } from '~/concepts/connectionTypes/types';
import { CreateConnectionTypeFieldsTableRow } from './CreateConnectionTypeFieldsTableRow';

type EmptyFieldsTableProps = {
  onAddSection: () => void;
  onAddField: () => void;
};

const EmptyFieldsTable: React.FC<EmptyFieldsTableProps> = ({ onAddSection, onAddField }) => (
  <Bullseye>
    <EmptyState variant={EmptyStateVariant.lg}>
      <EmptyStateHeader icon={<EmptyStateIcon icon={PlusCircleIcon} />} titleText="No fields" />
      <EmptyStateBody>
        Add fields to prompt users to input information, and optionally assign default values to
        those fields. Connection name and description fields are included by default.
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Button variant="secondary" onClick={onAddSection}>
            Add section heading
          </Button>
          <Button variant="secondary" onClick={onAddField}>
            Add field
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  </Bullseye>
);

type CreateConnectionTypeFieldsTableProps = {
  fields: ConnectionTypeField[];
  onFieldsChange: (fields: ConnectionTypeField[]) => void;
};

export const CreateConnectionTypeFieldsTable: React.FC<CreateConnectionTypeFieldsTableProps> = ({
  fields,
  onFieldsChange,
}) => {
  const [modalField, setModalField] = React.useState<
    { field?: ConnectionTypeField; index?: number; isEdit?: boolean } | undefined
  >();

  const columns = [
    'Section heading/field name',
    'Type',
    'Default value',
    'Environment variable',
    'Required',
  ];

  // TODO: drag and drop rows
  return (
    <>
      {fields.length > 0 ? (
        <>
          <Table data-testid="connection-type-fields-table">
            <Thead>
              <Tr>
                {columns.map((column, columnIndex) => (
                  <Th key={columnIndex}>{column}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {fields.map((row, index) => (
                <CreateConnectionTypeFieldsTableRow
                  key={index}
                  row={row}
                  columns={columns}
                  onEdit={() => {
                    setModalField({
                      field: row,
                      isEdit: true,
                    });
                  }}
                  onDelete={() => onFieldsChange(fields.filter((f) => f !== row))}
                  onDuplicate={(field) => {
                    setModalField({
                      field: structuredClone(field),
                    });
                  }}
                  onAddField={() => {
                    const nextSectionIndex = fields.findIndex(
                      (f) => f.type === ConnectionTypeFieldType.Section,
                      index + 1,
                    );
                    if (nextSectionIndex >= 0) {
                      setModalField({ index: nextSectionIndex });
                    } else {
                      setModalField({});
                    }
                  }}
                  onChange={(updatedField) => {
                    onFieldsChange([
                      ...fields.slice(0, index),
                      updatedField,
                      ...fields.slice(index + 1),
                    ]);
                  }}
                />
              ))}
            </Tbody>
          </Table>
          <ActionList className="pf-v5-u-mt-md">
            <ActionListItem>
              <Button
                variant="secondary"
                onClick={() =>
                  setModalField({ field: { type: ConnectionTypeFieldType.Section, name: '' } })
                }
              >
                Add section heading
              </Button>
            </ActionListItem>
            <ActionListItem>
              <Button variant="secondary" onClick={() => setModalField({})}>
                Add field
              </Button>
            </ActionListItem>
          </ActionList>
        </>
      ) : (
        <EmptyFieldsTable
          onAddSection={() =>
            setModalField({ field: { type: ConnectionTypeFieldType.Section, name: '' } })
          }
          onAddField={() => setModalField({})}
        />
      )}
      {modalField ? (
        <ConnectionTypeFieldModal
          field={modalField.field}
          isEdit={modalField.isEdit}
          onClose={() => setModalField(undefined)}
          isOpen
          onSubmit={(field) => {
            const i = modalField.field ? fields.indexOf(modalField.field) : -1;
            if (i >= 0) {
              // update
              onFieldsChange([...fields.slice(0, i), field, ...fields.slice(i + 1)]);
            } else if (modalField.index != null) {
              // insert
              onFieldsChange([
                ...fields.slice(0, modalField.index),
                field,
                ...fields.slice(modalField.index),
              ]);
            } else {
              // add
              onFieldsChange([...fields, field]);
            }
            setModalField(undefined);
          }}
        />
      ) : undefined}
    </>
  );
};
