import React from 'react';
import {
  Badge,
  EmptyStateVariant,
  HelperText,
  HelperTextItem,
  Menu,
  MenuContainer,
  MenuContent,
  MenuItem,
  MenuList,
  MenuSearch,
  MenuSearchInput,
  MenuToggle,
  SearchInput,
} from '@patternfly/react-core';
import useDebounceCallback from '#~/utilities/useDebounceCallback';
import PipelineSelectorTableRow from '#~/concepts/pipelines/content/pipelineSelector/PipelineSelectorTableRow';
import { SortableData, Table } from '#~/components/table';
import { ExperimentKF, PipelineVersionKF } from '#~/concepts/pipelines/kfTypes';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import { experimentSelectorColumns } from '#~/concepts/pipelines/content/experiment/columns';
import { pipelineVersionSelectorColumns } from '#~/concepts/pipelines/content/pipelineSelector/columns';

type FilterSelectorProps<T> = {
  resources: T[];
  selection: string | undefined;
  onSelect: (resource: T) => void;
};

type CustomPipelineRunToolbarSelectProps<T> = {
  resourceName: string;
  columns: SortableData<T>[];
  toggleTestId: string;
  tableTestId: string;
} & FilterSelectorProps<T>;

/**
 * Select dropdown with custom list of experiments/pipeline versions, which uses client-side sorting & filtering. This component
 * should mimic the presentation of PipelineSelector for a consistent user experience.
 */
const InnerCustomPipelineRunToolbarSelect = <T extends PipelineVersionKF | ExperimentKF>({
  resources,
  selection,
  onSelect,
  resourceName,
  columns,
  toggleTestId,
  tableTestId,
}: CustomPipelineRunToolbarSelectProps<T>): React.ReactNode => {
  const [isOpen, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [filteredResources, setFilteredResources] = React.useState<T[]>(resources);
  const [visibleLength, setVisibleLength] = React.useState(10);
  const placeholder = resources.length === 0 ? `No ${resourceName} available` : 'Select...';

  const toggleRef = React.useRef(null);
  const menuRef = React.useRef(null);

  const doSetSearchDebounced = useDebounceCallback(setSearch);

  React.useEffect(() => {
    if (search) {
      setFilteredResources(
        resources.filter((option) =>
          option.display_name.toLowerCase().includes(search.toLowerCase()),
        ),
      );
    } else {
      setFilteredResources(resources);
    }
    setVisibleLength(10);
  }, [search, resources]);

  const menu = (
    <Menu ref={menuRef} isScrollable>
      <MenuContent>
        <MenuSearch>
          <MenuSearchInput>
            <SearchInput
              value={search}
              aria-label={`Filter pipeline ${resourceName}`}
              onChange={(_event, value) => doSetSearchDebounced(value)}
            />
          </MenuSearchInput>
          <HelperText>
            <HelperTextItem>{`Type a name to search your ${resources.length} ${resourceName}.`}</HelperTextItem>
          </HelperText>
        </MenuSearch>
        <MenuList>
          <div role="menuitem">
            <Table
              data-testid={tableTestId}
              emptyTableView={
                <DashboardEmptyTableView
                  hasIcon={false}
                  onClearFilters={() => setSearch('')}
                  variant={EmptyStateVariant.xs}
                />
              }
              borders={false}
              variant="compact"
              columns={columns}
              data={filteredResources}
              truncateRenderingAt={visibleLength}
              rowRenderer={(row, index) => (
                <PipelineSelectorTableRow
                  key={index}
                  obj={row}
                  onClick={() => {
                    onSelect(row);
                    setOpen(false);
                  }}
                />
              )}
            />
          </div>
          {visibleLength < filteredResources.length && (
            <MenuItem
              isLoadButton
              onClick={(e) => {
                e.stopPropagation();
                setVisibleLength((length) => length + 10);
              }}
            >
              <>
                View more
                <Badge isRead>{`Showing ${visibleLength}/${filteredResources.length}`}</Badge>
              </>
            </MenuItem>
          )}
        </MenuList>
      </MenuContent>
    </Menu>
  );

  return (
    <MenuContainer
      isOpen={isOpen}
      toggleRef={toggleRef}
      toggle={
        <MenuToggle
          ref={toggleRef}
          style={{ minWidth: '300px', maxWidth: '500px' }}
          onClick={() => setOpen(!isOpen)}
          isExpanded={isOpen}
          isDisabled={!filteredResources.length}
          isFullWidth
          data-testid={toggleTestId}
        >
          {selection || placeholder}
        </MenuToggle>
      }
      menu={menu}
      menuRef={menuRef}
      onOpenChange={(open) => setOpen(open)}
    />
  );
};

export const ExperimentFilterSelector: React.FC<FilterSelectorProps<ExperimentKF>> = (props) => (
  <InnerCustomPipelineRunToolbarSelect
    resourceName="experiments"
    toggleTestId="experiment-toggle-button"
    tableTestId="experiment-selector-table-list"
    columns={experimentSelectorColumns}
    {...props}
  />
);

export const PipelineVersionFilterSelector: React.FC<FilterSelectorProps<PipelineVersionKF>> = (
  props,
) => (
  <InnerCustomPipelineRunToolbarSelect
    resourceName="versions"
    toggleTestId="pipeline-version-toggle-button"
    tableTestId="pipeline-version-selector-table-list"
    columns={pipelineVersionSelectorColumns}
    {...props}
  />
);
