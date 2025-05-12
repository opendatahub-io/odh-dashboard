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
import { DragDropSort, DraggableObject } from '@patternfly/react-drag-drop';
import { getMetricsColumnsLocalStorageKey } from './utils';
import { MetricColumnSearchInput } from './MetricColumnSearchInput';

interface CustomMetricsColumnsModalProps {
  columns: DraggableObject[];
  experimentId: string | undefined;
  onClose: () => void;
}

export const CustomMetricsColumnsModal: React.FC<CustomMetricsColumnsModalProps> = ({
  onClose,
  experimentId,
  columns: defaultColumns,
}) => {
  const [columns, setColumns] = React.useState(defaultColumns);
  const [filteredColumns, setFilteredColumns] = React.useState<DraggableObject[]>(defaultColumns);
  const metricsColumnsLocalStorageKey = getMetricsColumnsLocalStorageKey(experimentId);
  const selectedColumnNames = Object.values(columns).reduce((acc: string[], column) => {
    if (column.props.checked) {
      acc.push(String(column.id));
    }
    return acc;
  }, []);

  const onUpdate = React.useCallback(() => {
    localStorage.removeItem(metricsColumnsLocalStorageKey);
    localStorage.setItem(metricsColumnsLocalStorageKey, JSON.stringify(selectedColumnNames));

    onClose();
  }, [metricsColumnsLocalStorageKey, onClose, selectedColumnNames]);

  return (
    <Modal
      tabIndex={0}
      aria-label="Custom metrics columns modal"
      variant="small"
      isOpen
      onClose={onClose}
    >
      <ModalHeader
        title="Customize metrics columns"
        description={
          <Stack hasGutter className="pf-v6-u-pb-md">
            <StackItem className="pf-v6-u-mt-sm">
              Select up to 10 metrics that will display as columns in the table. Drag and drop
              column names to reorder them.
            </StackItem>

            <StackItem>
              <MetricColumnSearchInput
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
                {selectedColumnNames.length} / total {defaultColumns.length} selected
              </Label>
            </StackItem>
          </Stack>
        }
      />
      <ModalBody
        aria-label="Metrics column names"
        className="pf-v6-u-pt-0 pf-v6-u-pl-md pf-v6-u-pr-md"
        style={{ maxHeight: '500px' }}
      >
        <DragDropSort
          items={filteredColumns.map(({ id: filteredColumnId }) => {
            const {
              id,
              content,
              props: { checked },
            } = columns.find((column) => column.id === filteredColumnId) || {
              id: filteredColumnId,
            };
            const isDisabled = selectedColumnNames.length === 10 && !checked;

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
                        <Tooltip content="Maximum metrics selected. To view values of all metrics, go to the Compare runs page.">
                          {columnCheckbox}
                        </Tooltip>
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
            setFilteredColumns(newColumns);
            setColumns(newColumns);
          }}
        />
      </ModalBody>
      <ModalFooter>
        <Button key="update" variant="primary" onClick={onUpdate}>
          Update
        </Button>
        <Button key="cancel" variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
