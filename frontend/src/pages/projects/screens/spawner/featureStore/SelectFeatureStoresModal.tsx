import * as React from 'react';
/* eslint-disable @odh-dashboard/no-restricted-imports */
import {
  Alert,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  SearchInput,
  ToggleGroup,
  ToggleGroupItem,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { DashboardEmptyTableView, Table } from '@odh-dashboard/ui-core';
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
import { FEATURE_STORE_UNAVAILABLE_TOOLTIP } from './utils';

export type SelectFeatureStoresModalProps = {
  featureStores: WorkbenchFeatureStoreConfig[];
  unavailableFeatureStores?: SelectedFeatureStoreConfig[];
  initialSelections?: SelectedFeatureStoreConfig[];
  onSave: (featureStores: SelectedFeatureStoreConfig[]) => void;
  onClose: () => void;
};

type AvailabilityFilter = 'all' | 'available' | 'unavailable';

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
  const [availabilityFilter, setAvailabilityFilter] = React.useState<AvailabilityFilter>('all');

  const allFeatureStores = React.useMemo((): SelectedFeatureStoreConfig[] => {
    const availableIds = new Set(featureStores.map(getFeatureStoreProjectId));
    const unavailable = unavailableFeatureStores.filter(
      (fs) => !availableIds.has(getFeatureStoreProjectId(fs)),
    );
    return [...featureStores, ...unavailable];
  }, [featureStores, unavailableFeatureStores]);

  const availabilityCounts = React.useMemo(() => {
    let available = 0;
    let unavailable = 0;
    allFeatureStores.forEach((featureStore) => {
      if (featureStore.isUnavailable) {
        unavailable += 1;
      } else {
        available += 1;
      }
    });
    return {
      all: allFeatureStores.length,
      available,
      unavailable,
    };
  }, [allFeatureStores]);

  const initialSelectionIdsRef = React.useRef(
    getInitialSelections(allFeatureStores, initialSelections).map(getFeatureStoreProjectId),
  );
  const [selectedFeatureStores, setSelectedFeatureStores] = React.useState<
    SelectedFeatureStoreConfig[]
  >(() => getInitialSelections(allFeatureStores, initialSelections));

  const filteredFeatureStores = React.useMemo(() => {
    let stores = allFeatureStores;
    if (availabilityFilter === 'available') {
      stores = stores.filter((featureStore) => !featureStore.isUnavailable);
    } else if (availabilityFilter === 'unavailable') {
      stores = stores.filter((featureStore) => featureStore.isUnavailable);
    }

    const normalized = filterText.trim().toLowerCase();
    if (!normalized) {
      return stores;
    }

    return stores.filter((featureStore) =>
      featureStore.projectName.toLowerCase().includes(normalized),
    );
  }, [allFeatureStores, availabilityFilter, filterText]);

  const { selections, toggleSelection, isSelected, tableProps } =
    useCheckboxTableBase<SelectedFeatureStoreConfig>(
      filteredFeatureStores,
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
    setAvailabilityFilter('all');
  }, []);

  const hasUnavailableFeatureStores = availabilityCounts.unavailable > 0;

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
        {hasUnavailableFeatureStores && (
          <Alert
            className="pf-v6-u-mb-md"
            data-testid="feature-store-unavailable-alert"
            variant="info"
            isInline
            title={FEATURE_STORE_UNAVAILABLE_TOOLTIP}
          />
        )}
        <Table
          {...tableProps}
          data-testid="select-feature-stores-table"
          aria-label="Select feature stores table"
          variant="compact"
          enablePagination="compact"
          defaultSortColumn={1}
          data={filteredFeatureStores}
          columns={selectFeatureStoresColumns}
          toolbarContent={
            <ToolbarGroup>
              {hasUnavailableFeatureStores && (
                <ToolbarItem>
                  <ToggleGroup
                    aria-label="Filter by availability"
                    data-testid="select-feature-stores-availability-filter"
                  >
                    <ToggleGroupItem
                      text={`All (${availabilityCounts.all})`}
                      buttonId="select-feature-stores-filter-all"
                      isSelected={availabilityFilter === 'all'}
                      onChange={(_event, selected) => {
                        if (selected) {
                          setAvailabilityFilter('all');
                        }
                      }}
                    />
                    <ToggleGroupItem
                      text={`Available (${availabilityCounts.available})`}
                      buttonId="select-feature-stores-filter-available"
                      isSelected={availabilityFilter === 'available'}
                      onChange={(_event, selected) => {
                        if (selected) {
                          setAvailabilityFilter('available');
                        }
                      }}
                    />
                    <ToggleGroupItem
                      text={`Unavailable (${availabilityCounts.unavailable})`}
                      buttonId="select-feature-stores-filter-unavailable"
                      isSelected={availabilityFilter === 'unavailable'}
                      onChange={(_event, selected) => {
                        if (selected) {
                          setAvailabilityFilter('unavailable');
                        }
                      }}
                    />
                  </ToggleGroup>
                </ToolbarItem>
              )}
              <ToolbarItem>
                <SearchInput
                  aria-label="Find by name"
                  placeholder="Find by name"
                  value={filterText}
                  onChange={(_event, value) => setFilterText(value)}
                  onClear={() => setFilterText('')}
                  data-testid="select-feature-stores-name-filter"
                />
              </ToolbarItem>
            </ToolbarGroup>
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
