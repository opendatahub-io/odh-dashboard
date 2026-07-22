import React from 'react';
import {
  Button,
  ButtonVariant,
  Content,
  ContentVariants,
  DataList,
  DataListCell,
  DataListCheck,
  DataListItemCells,
  DataListItemRow,
  MenuToggle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Radio,
  Select,
  SelectList,
  SelectOption,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import {
  BulkSelect,
  type BulkSelectValue,
  type ColumnManagementModalColumn,
} from '@patternfly/react-component-groups';
import { DragDropSort, Droppable, type DraggableObject } from '@patternfly/react-drag-drop';

export type ColumnPreset = {
  label: string;
  visibleColumnKeys: string[];
};

type ManageColumnsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  appliedColumns: ColumnManagementModalColumn[];
  defaultColumns: ColumnManagementModalColumn[];
  applyColumns: (columns: ColumnManagementModalColumn[]) => void;
  presets?: ColumnPreset[];
};

type ColumnState = ColumnManagementModalColumn & { isShown: boolean };

const ManageColumnsModal: React.FC<ManageColumnsModalProps> = ({
  isOpen,
  onClose,
  appliedColumns,
  defaultColumns,
  applyColumns,
  presets,
}) => {
  const [currentColumns, setCurrentColumns] = React.useState<ColumnState[]>(() =>
    appliedColumns.map((col) => ({
      ...col,
      isShown: col.isShown ?? col.isShownByDefault,
    })),
  );

  const [isPresetOpen, setIsPresetOpen] = React.useState(false);

  // Derive the matching preset from current column visibility
  const selectedPreset = React.useMemo(() => {
    if (!presets || presets.length === 0) {
      return undefined;
    }
    const visibleKeys = new Set(currentColumns.filter((c) => c.isShown).map((c) => c.key));
    return presets.find((preset) => {
      const presetKeys = new Set(preset.visibleColumnKeys);
      return (
        presetKeys.size === visibleKeys.size && [...presetKeys].every((key) => visibleKeys.has(key))
      );
    })?.label;
  }, [currentColumns, presets]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }
    setCurrentColumns(
      appliedColumns.map((col) => ({
        ...col,
        isShown: col.isShown ?? col.isShownByDefault,
      })),
    );
    setIsPresetOpen(false);
  }, [isOpen, appliedColumns]);

  const resetToDefault = () => {
    setCurrentColumns(
      defaultColumns.map((col) => ({
        ...col,
        isShown: col.isShownByDefault,
      })),
    );
  };

  const handleCheckChange = (columnKey: string) => {
    setCurrentColumns((prev) =>
      prev.map((col) => (col.key === columnKey ? { ...col, isShown: !col.isShown } : col)),
    );
  };

  const handleBulkSelect = (value: BulkSelectValue) => {
    const selectAll = value === 'all' || value === 'page';
    setCurrentColumns((prev) =>
      prev.map((col) => ({
        ...col,
        isShown: selectAll,
      })),
    );
  };

  const handleDrop = (_event: unknown, newOrder: DraggableObject[]) => {
    setCurrentColumns((prev) => {
      const colMap = new Map(prev.map((c) => [c.key, c]));
      return newOrder.reduce<ColumnState[]>((acc, item) => {
        const col = colMap.get(String(item.id));
        if (col) {
          acc.push(col);
        }
        return acc;
      }, []);
    });
  };

  const handleSave = () => {
    applyColumns(
      currentColumns.map((col) => ({
        key: col.key,
        title: col.title,
        isShown: col.isShown,
        isShownByDefault: col.isShownByDefault,
      })),
    );
    onClose();
  };

  const handlePresetSelect = (presetLabel: string) => {
    const preset = presets?.find((p) => p.label === presetLabel);
    if (!preset) {
      return;
    }
    setIsPresetOpen(false);
    setCurrentColumns(
      defaultColumns.map((col) => ({
        ...col,
        isShown: preset.visibleColumnKeys.includes(col.key),
      })),
    );
  };

  const selectedCount = currentColumns.filter((c) => c.isShown).length;

  const hasChanges = React.useMemo(() => {
    if (currentColumns.length !== appliedColumns.length) {
      return true;
    }
    return currentColumns.some((col, i) => {
      const appliedIsShown = appliedColumns[i].isShown ?? appliedColumns[i].isShownByDefault;
      return col.key !== appliedColumns[i].key || col.isShown !== appliedIsShown;
    });
  }, [currentColumns, appliedColumns]);

  const renderDataListItem = (col: ColumnState, index: number) => (
    <DataListItemRow key={col.key}>
      <DataListCheck
        data-testid={`column-check-${col.key}`}
        isChecked={col.isShown}
        onChange={() => handleCheckChange(col.key)}
        id={`column-${index}-checkbox`}
        aria-labelledby={`column-${index}-label`}
      />
      <DataListItemCells
        dataListCells={[
          <DataListCell key={col.key} id={`column-${index}-label`}>
            <label htmlFor={`column-${index}-checkbox`}>{col.title}</label>
          </DataListCell>,
        ]}
      />
    </DataListItemRow>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="small"
      aria-label="Manage columns"
      data-testid="manage-columns-modal"
    >
      <ModalHeader title="Manage columns" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <Content component={ContentVariants.p}>
              Selected categories will be displayed in the table. Drag and drop to reorder columns.
              {presets && presets.length > 0
                ? ' Choose a preset view or select your own for a custom view.'
                : ''}
            </Content>
          </StackItem>
          {presets && presets.length > 0 ? (
            <StackItem>
              <Content component={ContentVariants.h3}>Quick select</Content>
              <Content component={ContentVariants.p}>Select a preset view</Content>
              <Select
                isOpen={isPresetOpen}
                onOpenChange={setIsPresetOpen}
                onSelect={(_e, value) => handlePresetSelect(String(value))}
                selected={selectedPreset}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsPresetOpen((prev) => !prev)}
                    isExpanded={isPresetOpen}
                    data-testid="organize-by-toggle"
                  >
                    {selectedPreset ?? 'None selected'}
                  </MenuToggle>
                )}
                data-testid="organize-by-select"
              >
                <SelectList>
                  {presets.map((preset) => (
                    <SelectOption
                      key={preset.label}
                      value={preset.label}
                      data-testid={`organize-by-option-${preset.label}`}
                    >
                      <Radio
                        isChecked={selectedPreset === preset.label}
                        name="organize-by-radio"
                        label={preset.label}
                        id={`preset-${preset.label}`}
                        onChange={() => handlePresetSelect(preset.label)}
                      />
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </StackItem>
          ) : null}
          <StackItem>
            <BulkSelect
              canSelectAll
              isDataPaginated={false}
              selectedCount={selectedCount}
              totalCount={currentColumns.length}
              onSelect={handleBulkSelect}
              pageSelected={currentColumns.every((c) => c.isShown)}
              pagePartiallySelected={
                currentColumns.some((c) => c.isShown) && !currentColumns.every((c) => c.isShown)
              }
            />
          </StackItem>
          <StackItem>
            <Button
              isInline
              onClick={resetToDefault}
              variant={ButtonVariant.link}
              data-testid="manage-columns-reset"
            >
              Reset to default
            </Button>
          </StackItem>
          <StackItem>
            <DragDropSort
              variant="DataList"
              items={currentColumns.map((col, index) => ({
                id: col.key,
                content: renderDataListItem(col, index),
              }))}
              onDrop={handleDrop}
              overlayProps={{ isCompact: true }}
            >
              <Droppable
                items={currentColumns.map((col) => ({
                  id: col.key,
                  content: col.title,
                }))}
                wrapper={<DataList aria-label="Column list" isCompact data-testid="column-list" />}
              />
            </DragDropSort>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          variant={ButtonVariant.primary}
          onClick={handleSave}
          isDisabled={selectedCount === 0 || !hasChanges}
        >
          Save
        </Button>
        <Button variant={ButtonVariant.link} onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ManageColumnsModal;
