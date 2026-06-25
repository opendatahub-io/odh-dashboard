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
import type { FeatureStoreProject } from '#~/api/featureStore/custom';
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
  featureStoreProjects: FeatureStoreProject[];
  alreadySelectedIds?: string[];
  onSave: (projects: FeatureStoreProject[]) => void;
  onClose: () => void;
};

export const SelectFeatureStoresModal: React.FC<SelectFeatureStoresModalProps> = ({
  featureStoreProjects,
  alreadySelectedIds = [],
  onSave,
  onClose,
}) => {
  const [filterText, setFilterText] = React.useState('');
  const [selectedProjects, setSelectedProjects] = React.useState<FeatureStoreProject[]>([]);

  const alreadySelectedIdSet = React.useMemo(
    () => new Set(alreadySelectedIds),
    [alreadySelectedIds],
  );

  const filteredProjects = React.useMemo(() => {
    const normalized = filterText.trim().toLowerCase();
    if (!normalized) {
      return featureStoreProjects;
    }

    return featureStoreProjects.filter((project) =>
      project.feastProjectName.toLowerCase().includes(normalized),
    );
  }, [featureStoreProjects, filterText]);

  const sort = useTableColumnSort<FeatureStoreProject>(selectFeatureStoresColumns, [], 1);
  const sortedProjects = React.useMemo(
    () => sort.transformData(filteredProjects),
    [filteredProjects, sort],
  );

  const { selections, toggleSelection, isSelected, tableProps, disableCheck } =
    useCheckboxTableBase<FeatureStoreProject>(
      sortedProjects,
      selectedProjects,
      setSelectedProjects,
      getFeatureStoreProjectId,
      { persistSelections: true },
    );

  React.useEffect(() => {
    featureStoreProjects.forEach((project) => {
      disableCheck(project, alreadySelectedIdSet.has(getFeatureStoreProjectId(project)));
    });
  }, [alreadySelectedIdSet, disableCheck, featureStoreProjects]);

  const onClearFilters = React.useCallback(() => {
    setFilterText('');
  }, []);

  const hasNewSelections = selections.length > 0;

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
          data={sortedProjects}
          columns={selectFeatureStoresColumns}
          getColumnSort={sort.getColumnSort}
          toolbarContent={
            <ToolbarItem style={{ flexBasis: '100%' }}>
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
          rowRenderer={(project, rowIndex) => {
            const projectId = getFeatureStoreProjectId(project);
            const isAlreadyConnected = alreadySelectedIdSet.has(projectId);

            return (
              <SelectFeatureStoresModalRow
                key={projectId}
                rowIndex={rowIndex}
                project={project}
                isSelected={isSelected(project)}
                isAlreadyConnected={isAlreadyConnected}
                onToggle={toggleSelection}
              />
            );
          }}
        />
      </ModalBody>
      <ModalFooter>
        <Button
          data-testid="select-feature-stores-connect-button"
          variant={hasNewSelections ? 'primary' : 'secondary'}
          isDisabled={!hasNewSelections}
          onClick={() => onSave(selections)}
        >
          {hasNewSelections
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
