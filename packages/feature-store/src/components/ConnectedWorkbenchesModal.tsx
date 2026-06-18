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
  Switch,
  ToolbarItem,
  Truncate,
} from '@patternfly/react-core';
/* eslint-enable @odh-dashboard/no-restricted-imports */
import TableBase from '@odh-dashboard/internal/components/table/TableBase';
import useTableColumnSort from '@odh-dashboard/internal/components/table/useTableColumnSort';
import SearchSelector from '@odh-dashboard/internal/components/searchSelector/SearchSelector';
import { SearchIcon } from '@patternfly/react-icons';
import { useConnectedWorkbenches } from '../apiHooks/useConnectedWorkbenches';
import {
  buildConnectedWorkbenchRows,
  filterRowsByToggle,
} from '../utils/connectedWorkbenchesUtils';
import { getConnectedWorkbenchColumns } from '../screens/connectedWorkbenches/const';
import ConnectedWorkbenchTableRow from '../screens/connectedWorkbenches/ConnectedWorkbenchTableRow';
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
  const [hideProjectsWithConnectedWorkbenches, setHideProjectsWithConnectedWorkbenches] =
    React.useState(false);
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
    const rows = buildConnectedWorkbenchRows(projectData);
    return filterRowsByToggle(rows, hideProjectsWithConnectedWorkbenches);
  }, [selectedFeastProjectName, selectedProject, projects, hideProjectsWithConnectedWorkbenches]);

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
  const sortedRows = React.useMemo(() => sort.transformData(tableRows), [sort, tableRows]);
  const paginatedRows = sortedRows.slice(pageSize * (page - 1), pageSize * page);

  React.useEffect(() => {
    setPage(1);
  }, [selectedFeastProjectName, hideProjectsWithConnectedWorkbenches, tableRows.length]);

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
      variant="medium"
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
                    title="No authorized projects found"
                    description="No data science projects are authorized to access this feature store."
                    headerIcon={SearchIcon}
                  />
                }
                toolbarContent={
                  <ToolbarItem alignSelf="center">
                    <Switch
                      id="hide-projects-with-connected-workbenches"
                      label="Hide projects with connected workbenches"
                      isChecked={hideProjectsWithConnectedWorkbenches}
                      onChange={(_event, checked) =>
                        setHideProjectsWithConnectedWorkbenches(checked)
                      }
                    />
                  </ToolbarItem>
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
