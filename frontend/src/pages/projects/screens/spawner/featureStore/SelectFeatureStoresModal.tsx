import * as React from 'react';
/* eslint-disable @odh-dashboard/no-restricted-imports */
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  SearchInput,
  ToolbarItem,
} from '@patternfly/react-core';
import { DashboardEmptyTableView, TableBase, useTableColumnSort } from '@odh-dashboard/ui-core';
/* eslint-enable @odh-dashboard/no-restricted-imports */
import { useCheckboxTableBase } from '#~/components/table';
import type {
  WorkbenchFeatureStoreConfig,
  SelectedFeatureStoreConfig,
} from './useWorkbenchFeatureStores';
import { SelectFeatureStoresModalRow } from './SelectFeatureStoresModalRow';
import {
  getFeatureStoreProjectId,
  SELECT_FEATURE_STORES_MODAL_CONNECT_BUTTON,
  SELECT_FEATURE_STORES_MODAL_DESCRIPTION,
  SELECT_FEATURE_STORES_MODAL_SELECT_BUTTON,
  SELECT_FEATURE_STORES_MODAL_TITLE,
  selectFeatureStoresColumns,
} from './selectFeatureStoresModalConst';

export type SelectFeatureStoresModalProps = {
  featureStores: WorkbenchFeatureStoreConfig[];
  unavailableFeatureStores?: SelectedFeatureStoreConfig[];
  initialSelections?: SelectedFeatureStoreConfig[];
  onSave: (featureStores: SelectedFeatureStoreConfig[]) => void;
  onClose: () => void;
};

const getInitialSelections = (
  featureStores: SelectedFeatureStoreConfig[],
  initialSelections: SelectedFeatureStoreConfig[],
): SelectedFeatureStoreConfig[] => {
  const initialSelectionIds = new Set(initialSelections.map(getFeatureStoreProjectId));
  return featureStores.filter((featureStore) =>
    initialSelectionIds.has(getFeatureStoreProjectId(featureStore)),
  );
};

const haveSameSelectionIds = (currentIds: string[], initialIds: string[]): boolean => {
  if (currentIds.length !== initialIds.length) {
    return false;
  }
  const initialIdSet = new Set(initialIds);
  return currentIds.every((id) => initialIdSet.has(id));
};

export const SelectFeatureStoresModal: React.FC<SelectFeatureStoresModalProps> = ({
  featureStores,
  unavailableFeatureStores = [],
  initialSelections = [],
  onSave,
  onClose,
}) => {
  const [filterText, setFilterText] = React.useState('');

  const allFeatureStores = React.useMemo((): SelectedFeatureStoreConfig[] => {
    const availableIds = new Set(featureStores.map(getFeatureStoreProjectId));
    const unavailable = unavailableFeatureStores.filter(
      (fs) => !availableIds.has(getFeatureStoreProjectId(fs)),
    );
    return [...featureStores, ...unavailable];
  }, [featureStores, unavailableFeatureStores]);

  const initialSelectionIdsRef = React.useRef(
    getInitialSelections(allFeatureStores, initialSelections).map(getFeatureStoreProjectId),
  );
  const [selectedFeatureStores, setSelectedFeatureStores] = React.useState<
    SelectedFeatureStoreConfig[]
  >(() => getInitialSelections(allFeatureStores, initialSelections));

  const filteredFeatureStores = React.useMemo(() => {
    const normalized = filterText.trim().toLowerCase();
    if (!normalized) {
      return allFeatureStores;
    }

    return allFeatureStores.filter((featureStore) =>
      featureStore.projectName.toLowerCase().includes(normalized),
    );
  }, [allFeatureStores, filterText]);

  const sort = useTableColumnSort<SelectedFeatureStoreConfig>(selectFeatureStoresColumns, [], 1);
  const sortedFeatureStores = React.useMemo(
    () => sort.transformData(filteredFeatureStores),
    [filteredFeatureStores, sort],
  );

  const { selections, toggleSelection, isSelected, tableProps } =
    useCheckboxTableBase<SelectedFeatureStoreConfig>(
      sortedFeatureStores,
      selectedFeatureStores,
      setSelectedFeatureStores,
      getFeatureStoreProjectId,
      { persistSelections: true },
    );

  const hasSelectionChanged = React.useMemo(() => {
    const currentSelectionIds = selections.map(getFeatureStoreProjectId);
    return !haveSameSelectionIds(currentSelectionIds, initialSelectionIdsRef.current);
  }, [selections]);

  const onClearFilters = React.useCallback(() => {
    setFilterText('');
  }, []);

  return (
    <Modal
      isOpen
      variant="medium"
      onClose={onClose}
      data-testid="select-feature-stores-modal"
      aria-labelledby="select-feature-stores-modal-title"
    >
      <ModalHeader
        title={SELECT_FEATURE_STORES_MODAL_TITLE}
        labelId="select-feature-stores-modal-title"
        description={SELECT_FEATURE_STORES_MODAL_DESCRIPTION}
      />
      <ModalBody>
        <TableBase
          {...tableProps}
          data-testid="select-feature-stores-table"
          aria-label="Select feature stores table"
          variant="compact"
          data={sortedFeatureStores}
          columns={selectFeatureStoresColumns}
          getColumnSort={sort.getColumnSort}
          toolbarContent={
            <ToolbarItem className="pf-v6-u-w-100">
              <SearchInput
                aria-label="Find by name"
                placeholder="Find by name"
                value={filterText}
                onChange={(_event, value) => setFilterText(value)}
                onClear={onClearFilters}
                data-testid="select-feature-stores-name-filter"
              />
            </ToolbarItem>
          }
          emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
          onClearFilters={onClearFilters}
          rowRenderer={(featureStore, rowIndex) => {
            const projectId = getFeatureStoreProjectId(featureStore);

            return (
              <SelectFeatureStoresModalRow
                key={projectId}
                rowIndex={rowIndex}
                featureStore={featureStore}
                isSelected={isSelected(featureStore)}
                onToggle={toggleSelection}
              />
            );
          }}
        />
      </ModalBody>
      <ModalFooter>
        <Button
          data-testid="select-feature-stores-connect-button"
          variant={hasSelectionChanged ? 'primary' : 'secondary'}
          isDisabled={!hasSelectionChanged}
          onClick={() => onSave(selections)}
        >
          {hasSelectionChanged
            ? SELECT_FEATURE_STORES_MODAL_CONNECT_BUTTON
            : SELECT_FEATURE_STORES_MODAL_SELECT_BUTTON}
        </Button>
        <Button
          data-testid="select-feature-stores-cancel-button"
          variant="secondary"
          onClick={onClose}
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default SelectFeatureStoresModal;
