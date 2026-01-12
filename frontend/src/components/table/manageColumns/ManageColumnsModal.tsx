import React from 'react';
import { Checkbox, Flex, FlexItem, Label, Stack, StackItem, Tooltip } from '@patternfly/react-core';
import { DragDropSort, DraggableObject } from '@patternfly/react-drag-drop';
import ContentModal, { ButtonAction } from '#~/components/modals/ContentModal';
import { ManageColumnSearchInput } from './ManageColumnSearchInput';
import { ManageColumnsModalProps, ManagedColumn } from './types';

export const ManageColumnsModal: React.FC<ManageColumnsModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  columns: initialColumns,
  title = 'Manage columns',
  description,
  maxSelections,
  maxSelectionsTooltip = 'Maximum columns selected.',
  searchPlaceholder = 'Filter by column name',
  dataTestId = 'manage-columns-modal',
}) => {
  const [columns, setColumns] = React.useState<ManagedColumn[]>(initialColumns);
  const [filteredColumns, setFilteredColumns] = React.useState<ManagedColumn[]>(initialColumns);
  const [searchValue, setSearchValue] = React.useState('');

  // Reset state when modal opens with new columns
  React.useEffect(() => {
    if (isOpen) {
      setColumns(initialColumns);
      setFilteredColumns(initialColumns);
      setSearchValue('');
    }
  }, [isOpen, initialColumns]);

  const selectedCount = columns.filter((col) => col.isVisible).length;
  const isMaxReached = maxSelections !== undefined && selectedCount >= maxSelections;

  const handleUpdate = React.useCallback(() => {
    const visibleColumnIds = columns.filter((col) => col.isVisible).map((col) => col.id);
    onUpdate(visibleColumnIds);
    onClose();
  }, [columns, onUpdate, onClose]);

  const handleSearch = React.useCallback(
    (value: string) => {
      setSearchValue(value);
      if (!value) {
        setFilteredColumns(columns);
      } else {
        setFilteredColumns(
          columns.filter((col) => col.label.toLowerCase().includes(value.toLowerCase())),
        );
      }
    },
    [columns],
  );

  const handleToggleColumn = React.useCallback((columnId: string, isChecked: boolean) => {
    setColumns((prev) =>
      prev.map((col) => (col.id === columnId ? { ...col, isVisible: isChecked } : col)),
    );
  }, []);

  const handleDrop = React.useCallback((_: unknown, newItems: DraggableObject[]) => {
    const newOrder = newItems.map((item) => String(item.id));
    setColumns((prev) => {
      const columnMap = new Map(prev.map((col) => [col.id, col]));
      return newOrder.map((id) => columnMap.get(id)).filter((col): col is ManagedColumn => !!col);
    });
    setFilteredColumns((prev) => {
      const columnMap = new Map(prev.map((col) => [col.id, col]));
      return newOrder
        .filter((id) => prev.some((col) => col.id === id))
        .map((id) => columnMap.get(id))
        .filter((col): col is ManagedColumn => !!col);
    });
  }, []);

  if (!isOpen) {
    return null;
  }

  const buttonActions: ButtonAction[] = [
    {
      label: 'Update',
      onClick: handleUpdate,
      variant: 'primary',
      dataTestId: `${dataTestId}-update-button`,
    },
    {
      label: 'Cancel',
      onClick: onClose,
      variant: 'link',
      dataTestId: `${dataTestId}-cancel-button`,
    },
  ];

  const descriptionContent = (
    <Stack hasGutter className="pf-v6-u-pb-md">
      {description && <StackItem className="pf-v6-u-mt-sm">{description}</StackItem>}
      <StackItem>
        <ManageColumnSearchInput
          value={searchValue}
          placeholder={searchPlaceholder}
          onSearch={handleSearch}
          dataTestId={`${dataTestId}-search`}
        />
      </StackItem>
      <StackItem>
        <Label>
          {selectedCount} / total {columns.length} selected
        </Label>
      </StackItem>
    </Stack>
  );

  const draggableItems: DraggableObject[] = filteredColumns.map((col) => {
    // Find current state from columns (not filteredColumns) to get latest isVisible
    const currentCol = columns.find((c) => c.id === col.id) ?? col;
    const isDisabled = isMaxReached && !currentCol.isVisible;

    const checkbox = (
      <Checkbox
        id={col.id}
        isChecked={currentCol.isVisible}
        isDisabled={isDisabled}
        onChange={(_, checked) => handleToggleColumn(col.id, checked)}
      />
    );

    return {
      id: col.id,
      content: (
        <div className="pf-v6-u-display-inline-block">
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            flexWrap={{ default: 'nowrap' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem>
              {isDisabled ? <Tooltip content={maxSelectionsTooltip}>{checkbox}</Tooltip> : checkbox}
            </FlexItem>
            <FlexItem>{col.label}</FlexItem>
          </Flex>
        </div>
      ),
      props: { checked: currentCol.isVisible },
    };
  });

  return (
    <ContentModal
      onClose={onClose}
      title={title}
      description={descriptionContent}
      contents={<DragDropSort items={draggableItems} variant="default" onDrop={handleDrop} />}
      buttonActions={buttonActions}
      dataTestId={dataTestId}
      variant="small"
      bodyLabel="Column names"
    />
  );
};
