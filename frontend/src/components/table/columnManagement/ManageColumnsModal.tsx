import React from 'react';
import {
  Button,
  Checkbox,
  Flex,
  FlexItem,
  Label,
  Stack,
  StackItem,
  Tooltip,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@patternfly/react-core';
import { DragDropSort } from '@patternfly/react-drag-drop';
import { ColumnSearchInput } from './ColumnSearchInput';
import { ColumnId, ManageableColumn } from './types';

interface ManageColumnsModalProps {
  columns: ManageableColumn[];
  onClose: () => void;
  onUpdate: (selectedColumnIds: ColumnId[]) => void;
  title?: string;
  description?: React.ReactNode;
  searchPlaceholder?: string;
  maxSelections?: number;
  maxSelectionsTooltip?: string;
}

export const ManageColumnsModal: React.FC<ManageColumnsModalProps> = ({
  onClose,
  onUpdate,
  columns: defaultColumns,
  title = 'Manage columns',
  description,
  searchPlaceholder,
  maxSelections = 10,
  maxSelectionsTooltip = 'Maximum columns selected.',
}) => {
  const [columns, setColumns] = React.useState(defaultColumns);
  const [filteredColumns, setFilteredColumns] = React.useState<ManageableColumn[]>(defaultColumns);

  const selectedColumnIds = Object.values(columns).reduce((acc: ColumnId[], column) => {
    if (column.props.checked) {
      acc.push(String(column.id));
    }
    return acc;
  }, []);

  const handleUpdate = React.useCallback(() => {
    onUpdate(selectedColumnIds);
    onClose();
  }, [onUpdate, onClose, selectedColumnIds]);

  return (
    <Modal tabIndex={0} aria-label="Manage columns modal" variant="small" isOpen onClose={onClose}>
      <ModalHeader
        title={title}
        description={
          <Stack hasGutter className="pf-v6-u-pb-md">
            {description && <StackItem className="pf-v6-u-mt-sm">{description}</StackItem>}

            <StackItem>
              <ColumnSearchInput
                placeholder={searchPlaceholder}
                onSearch={(searchText) => {
                  let newColumns = defaultColumns;

                  if (searchText) {
                    newColumns = defaultColumns.filter((column) =>
                      String(column.id).toLowerCase().includes(searchText.toLowerCase()),
                    );
                  }

                  setFilteredColumns(newColumns);
                }}
              />
            </StackItem>

            <StackItem>
              <Label>
                {selectedColumnIds.length} / {defaultColumns.length} selected
              </Label>
            </StackItem>
          </Stack>
        }
      />
      <ModalBody
        aria-label="Column names"
        className="pf-v6-u-pt-0 pf-v6-u-pl-md pf-v6-u-pr-md"
        style={{ maxHeight: '500px' }}
      >
        <DragDropSort
          items={filteredColumns.map(({ id: filteredColumnId }) => {
            const column = columns.find((col) => col.id === filteredColumnId) || {
              id: filteredColumnId,
              content: filteredColumnId,
              props: { checked: false },
            };
            const { id, content, props } = column;
            const { checked } = props;
            const isDisabled = selectedColumnIds.length === maxSelections && !checked;

            const columnCheckbox = (
              <Checkbox
                id={String(id)}
                isChecked={checked}
                isDisabled={isDisabled}
                onChange={(_, isChecked) =>
                  setColumns((prevColumns) =>
                    prevColumns.map((prevColumn) => {
                      if (prevColumn.id === id) {
                        return { id, content, props: { checked: isChecked } };
                      }

                      return prevColumn;
                    }),
                  )
                }
              />
            );

            return {
              id,
              content: (
                <div className="pf-v6-u-display-inline-block">
                  <Flex
                    alignItems={{ default: 'alignItemsCenter' }}
                    flexWrap={{ default: 'nowrap' }}
                    spaceItems={{ default: 'spaceItemsSm' }}
                  >
                    <FlexItem>
                      {isDisabled ? (
                        <Tooltip content={maxSelectionsTooltip}>{columnCheckbox}</Tooltip>
                      ) : (
                        columnCheckbox
                      )}
                    </FlexItem>
                    <FlexItem>{id}</FlexItem>
                  </Flex>
                </div>
              ),
              props: { checked },
            };
          })}
          variant="default"
          onDrop={(_, newColumns) => {
            // The items we pass to DragDropSort are ManageableColumn objects, so the returned array is too
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            const managedColumns = newColumns as ManageableColumn[];
            setFilteredColumns(managedColumns);
            setColumns(managedColumns);
          }}
        />
      </ModalBody>
      <ModalFooter>
        <Button key="update" variant="primary" onClick={handleUpdate}>
          Update
        </Button>
        <Button key="cancel" variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
