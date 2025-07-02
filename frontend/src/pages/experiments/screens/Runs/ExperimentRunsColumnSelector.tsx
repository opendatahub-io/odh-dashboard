import React from 'react';
import {
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
  TreeView,
  TreeViewDataItem,
} from '@patternfly/react-core';
import DashboardModalFooter from '#~/concepts/dashboard/DashboardModalFooter';

type ColumnSelectorItem = {
  id: string;
  name: string;
  checked: boolean;
};

type ColumnSelection = {
  metrics: ColumnSelectorItem[];
  parameters: ColumnSelectorItem[];
  tags: ColumnSelectorItem[];
};

type ExperimentRunsColumnSelectorProps = {
  isOpen: boolean;
  onClose: () => void;
  availableColumns: {
    metrics: Set<string>;
    parameters: Set<string>;
    tags: Set<string>;
  };
  selectedColumns: ColumnSelection;
  onSelectionChange: (selection: ColumnSelection) => void;
};

const ExperimentRunsColumnSelector: React.FC<ExperimentRunsColumnSelectorProps> = ({
  isOpen,
  onClose,
  availableColumns,
  selectedColumns,
  onSelectionChange,
}) => {
  // Convert sets to tree data format
  const createTreeData = React.useCallback((): TreeViewDataItem[] => {
    const createCategoryItems = (
      categoryName: string,
      categoryId: string,
      items: Set<string>,
      selectedItems: ColumnSelectorItem[],
    ): TreeViewDataItem => {
      const children: TreeViewDataItem[] = Array.from(items).map((item) => ({
        name: item,
        id: `${categoryId}-${item}`,
        checkProps: {
          checked: selectedItems.some((selected) => selected.id === item && selected.checked),
        },
      }));

      // Determine if all, some, or none of the children are checked
      const checkedChildren = children.filter((child) => child.checkProps?.checked);
      let categoryChecked: boolean | null = false;
      if (checkedChildren.length === children.length && children.length > 0) {
        categoryChecked = true;
      } else if (checkedChildren.length > 0) {
        categoryChecked = null; // Indeterminate state
      }

      return {
        name: `${categoryName} (${children.length})`,
        id: categoryId,
        checkProps: {
          checked: categoryChecked,
        },
        children,
        defaultExpanded: true,
      };
    };

    return [
      createCategoryItems('Metrics', 'metrics', availableColumns.metrics, selectedColumns.metrics),
      createCategoryItems(
        'Parameters',
        'parameters',
        availableColumns.parameters,
        selectedColumns.parameters,
      ),
      createCategoryItems('Tags', 'tags', availableColumns.tags, selectedColumns.tags),
    ];
  }, [availableColumns, selectedColumns]);

  const treeData = createTreeData();

  const onCheck = (event: React.ChangeEvent, treeViewItem: TreeViewDataItem) => {
    const { target } = event;
    if (!('checked' in target)) {
      return;
    }

    const checked = Boolean(target.checked);
    const itemId = treeViewItem.id ? String(treeViewItem.id) : '';
    const itemName = treeViewItem.name ? String(treeViewItem.name) : '';

    // Handle category-level checks (parent nodes)
    if (itemId === 'metrics' || itemId === 'parameters' || itemId === 'tags') {
      const category = itemId;
      const newSelection = { ...selectedColumns };

      if (treeViewItem.children) {
        newSelection[category] = treeViewItem.children.map((child) => ({
          id: child.name ? String(child.name) : '',
          name: child.name ? String(child.name) : '',
          checked,
        }));

        onSelectionChange(newSelection);
      }
    } else {
      // Handle individual item checks (child nodes)
      const [category] = itemId.split('-');

      if (category === 'metrics' || category === 'parameters' || category === 'tags') {
        const newSelection = { ...selectedColumns };
        const categoryItems = [...newSelection[category]];
        const existingIndex = categoryItems.findIndex((item) => item.id === itemName);

        if (existingIndex >= 0) {
          categoryItems[existingIndex] = { ...categoryItems[existingIndex], checked };
        } else {
          categoryItems.push({ id: itemName, name: itemName, checked });
        }

        newSelection[category] = categoryItems;
        onSelectionChange(newSelection);
      }
    }
  };

  const handleApply = () => {
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      variant="medium"
      onClose={onClose}
      data-testid="experiment-runs-column-selector-modal"
      isOpen
    >
      <ModalHeader title="Select Columns" />
      <ModalBody>
        <TreeView aria-label="Column selector" data={treeData} onCheck={onCheck} hasCheckboxes />
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter onCancel={onClose} onSubmit={handleApply} submitLabel="Apply" />
      </ModalFooter>
    </Modal>
  );
};

export default ExperimentRunsColumnSelector;
