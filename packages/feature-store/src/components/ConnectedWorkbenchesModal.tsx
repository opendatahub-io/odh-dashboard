import * as React from 'react';
/* eslint-disable @odh-dashboard/no-restricted-imports -- custom modal with table, selector, and toolbar; ContentModal does not support this layout */
import {
  Alert,
  Bullseye,
  Content,
  Flex,
  FlexItem,
  MenuItem,
  Modal,
  ModalBody,
  ModalHeader,
  Spinner,
  Stack,
  StackItem,
  Truncate,
} from '@patternfly/react-core';
/* eslint-enable @odh-dashboard/no-restricted-imports */
import { TableBase, useTableColumnSort } from '@odh-dashboard/ui-core';
import SearchSelector from '@odh-dashboard/internal/components/searchSelector/SearchSelector';
import { SearchIcon } from '@patternfly/react-icons';
import { useConnectedWorkbenches } from '../apiHooks/useConnectedWorkbenches';
import { buildConnectedWorkbenchRows } from '../utils/connectedWorkbenchesUtils';
import { getConnectedWorkbenchColumns } from '../screens/connectedWorkbenches/const';
import ConnectedWorkbenchTableRow from '../screens/connectedWorkbenches/ConnectedWorkbenchTableRow';
import ConnectedWorkbenchesToolbar from '../screens/connectedWorkbenches/ConnectedWorkbenchesToolbar';
import useConnectedWorkbenchFilters from '../screens/connectedWorkbenches/useConnectedWorkbenchFilters';
import type { ConnectedWorkbenchTableRow as ConnectedWorkbenchTableRowData } from '../types/connectedWorkbenches';
import EmptyStateFeatureStore from '../screens/components/EmptyStateFeatureStore';

export type ConnectedWorkbenchesModalProps = {
  onClose: () => void;
  initialFeastProjectName?: string;
};

const ConnectedWorkbenchesModal: React.FC<ConnectedWorkbenchesModalProps> = ({
  onClose,
  initialFeastProjectName,
}) => {
  const [selectedFeastProjectName, setSelectedFeastProjectName] = React.useState(
    initialFeastProjectName ?? '',
  );
  const [searchText, setSearchText] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);

  const { projects, selectedProject, loaded, error } = useConnectedWorkbenches(
    selectedFeastProjectName || undefined,
  );

  React.useEffect(() => {
    if (loaded && selectedFeastProjectName && !selectedProject) {
      setSelectedFeastProjectName('');
    }
  }, [loaded, selectedFeastProjectName, selectedProject]);

  const tableRows = React.useMemo(() => {
    const projectData = selectedFeastProjectName ? selectedProject : projects;
    return buildConnectedWorkbenchRows(projectData);
  }, [selectedFeastProjectName, selectedProject, projects]);

  const filterState = useConnectedWorkbenchFilters(tableRows);

  const { clearAllFilters } = filterState;
  const prevFeastProjectRef = React.useRef(selectedFeastProjectName);
  React.useEffect(() => {
    if (prevFeastProjectRef.current !== selectedFeastProjectName) {
      prevFeastProjectRef.current = selectedFeastProjectName;
      clearAllFilters();
    }
  }, [selectedFeastProjectName, clearAllFilters]);

  const filteredProjects = React.useMemo(
    () =>
      projects.filter(
        (project) =>
          !searchText || project.feastProjectName.toLowerCase().includes(searchText.toLowerCase()),
      ),
    [projects, searchText],
  );

  const columns = React.useMemo(
    () => getConnectedWorkbenchColumns(selectedFeastProjectName || undefined),
    [selectedFeastProjectName],
  );

  const sort = useTableColumnSort<ConnectedWorkbenchTableRowData>(columns, [], 0);
  const sortedRows = React.useMemo(
    () => sort.transformData(filterState.filteredRows),
    [sort, filterState.filteredRows],
  );
  const paginatedRows = sortedRows.slice(pageSize * (page - 1), pageSize * page);

  React.useEffect(() => {
    setPage(1);
  }, [selectedFeastProjectName, filterState.filteredRows.length]);

  const isLoading = !loaded && !error;

  const selector = (
    <SearchSelector
      dataTestId="connected-workbenches-modal-search"
      minWidth="250px"
      toggleLabelledBy="connected-workbenches-modal-project-selector-label"
      searchFocusOnOpen
      searchPlaceholder="Feature store name"
      searchValue={searchText}
      onSearchChange={setSearchText}
      onSearchClear={() => setSearchText('')}
      isDisabled={isLoading}
      toggleContent={selectedFeastProjectName || 'All feature stores'}
      appendTo={() => document.body}
    >
      <MenuItem
        key="__all__"
        isSelected={!selectedFeastProjectName}
        onClick={() => {
          setSearchText('');
          setSelectedFeastProjectName('');
        }}
      >
        All feature stores
      </MenuItem>
      {filteredProjects.map((project) => (
        <MenuItem
          key={project.feastProjectName}
          isSelected={project.feastProjectName === selectedFeastProjectName}
          onClick={() => {
            setSearchText('');
            setSelectedFeastProjectName(project.feastProjectName);
          }}
        >
          <Truncate content={project.feastProjectName}>{project.feastProjectName}</Truncate>
        </MenuItem>
      ))}
    </SearchSelector>
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="large"
      aria-labelledby="connected-workbenches-modal-title"
    >
      <ModalHeader
        title="Connected workbenches"
        labelId="connected-workbenches-modal-title"
        description="View workbenches connected to the selected feature store. Rows with no workbench name represent authorized projects that do not yet contain a connected workbench."
      />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <Flex
              spaceItems={{ default: 'spaceItemsSm' }}
              alignItems={{ default: 'alignItemsCenter' }}
            >
              <FlexItem>
                <Content
                  id="connected-workbenches-modal-project-selector-label"
                  component="p"
                  style={{ marginBlock: 0 }}
                >
                  Feature store
                </Content>
              </FlexItem>
              <FlexItem>{selector}</FlexItem>
            </Flex>
          </StackItem>

          <StackItem>
            {isLoading && (
              <Bullseye aria-live="polite" aria-busy>
                <Spinner
                  size="lg"
                  aria-label="Loading connected workbenches"
                  data-testid="connected-workbenches-loading-spinner"
                />
              </Bullseye>
            )}

            {error && (
              <Alert variant="danger" title="Failed to load connected workbenches" isInline />
            )}

            {loaded && !error && (
              <TableBase
                data-testid="connected-workbenches-table"
                id="connected-workbenches-table"
                variant="compact"
                enablePagination="compact"
                data={paginatedRows}
                columns={columns}
                itemCount={sortedRows.length}
                page={page}
                perPage={pageSize}
                onSetPage={(_e, newPage) => setPage(newPage)}
                onPerPageSelect={(_e, newSize, newPage) => {
                  setPageSize(newSize);
                  setPage(newPage);
                }}
                getColumnSort={sort.getColumnSort}
                emptyTableView={
                  <EmptyStateFeatureStore
                    testid="connected-workbenches-empty-state"
                    title={
                      filterState.hasActiveFilters
                        ? 'No results found'
                        : 'No authorized projects found'
                    }
                    description={
                      filterState.hasActiveFilters
                        ? 'No workbenches match the current filters. Try adjusting or clearing the filters.'
                        : 'No data science projects are authorized to access this feature store.'
                    }
                    headerIcon={SearchIcon}
                  />
                }
                onClearFilters={
                  filterState.hasActiveFilters ? filterState.clearAllFilters : undefined
                }
                toolbarContent={
                  <ConnectedWorkbenchesToolbar
                    workbenchNameFilter={filterState.workbenchNameFilter}
                    selectedProjects={filterState.selectedProjects}
                    selectedPermissions={filterState.selectedPermissions}
                    hideProjectsWithConnectedWorkbenches={
                      filterState.hideProjectsWithConnectedWorkbenches
                    }
                    projectOptions={filterState.projectOptions}
                    onWorkbenchNameFilterChange={filterState.setWorkbenchNameFilter}
                    onProjectToggle={filterState.toggleProject}
                    onPermissionToggle={filterState.togglePermission}
                    onHideProjectsWithConnectedWorkbenchesChange={
                      filterState.setHideProjectsWithConnectedWorkbenches
                    }
                  />
                }
                rowRenderer={(row) => <ConnectedWorkbenchTableRow key={row.id} row={row} />}
              />
            )}
          </StackItem>
        </Stack>
      </ModalBody>
    </Modal>
  );
};

export default ConnectedWorkbenchesModal;
