import * as React from 'react';
import {
  EmptyStateVariant,
  HelperText,
  HelperTextItem,
  Icon,
  Menu,
  MenuContainer,
  MenuContent,
  MenuList,
  MenuSearch,
  MenuSearchInput,
  MenuToggle,
  SearchInput,
  Spinner,
} from '@patternfly/react-core';
import { TableVariant } from '@patternfly/react-table';
import PipelineSelectorTableRow from '~/concepts/pipelines/content/pipelineSelector/PipelineSelectorTableRow';
import { TableBase, getTableColumnSort } from '~/components/table';
import usePipelinesTable from '~/concepts/pipelines/content/tables/pipeline/usePipelinesTable';
import { usePipelineLoadMore } from '~/concepts/pipelines/content/tables/usePipelineLoadMore';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import { pipelineSelectorColumns } from '~/concepts/pipelines/content/pipelineSelector/columns';
import PipelineViewMoreFooterRow from '~/concepts/pipelines/content/tables/PipelineViewMoreFooterRow';
import { useSelectorSearch } from '~/concepts/pipelines/content/pipelineSelector/utils';
import EmptyTableView from '~/concepts/pipelines/content/tables/EmptyTableView';
import { getTableSortProps } from '~/concepts/pipelines/content/tables/usePipelineTable';

type PipelineSelectorProps = {
  selection?: string;
  onSelect: (pipeline: PipelineKF) => void;
};

const PipelineSelector: React.FC<PipelineSelectorProps> = ({ selection, onSelect }) => {
  const [isOpen, setOpen] = React.useState(false);

  const [
    [{ items: initialData, totalSize: fetchedSize, nextPageToken: initialPageToken }, loaded],
    { initialLoaded, ...tableProps },
  ] = usePipelinesTable();
  const sortProps = getTableSortProps(tableProps);
  const { setFilter, filter, sortDirection, sortField } = tableProps;

  const { totalSize, ...searchProps } = useSelectorSearch({ setFilter, fetchedSize, loaded });
  const { onClear } = searchProps;

  const { data: pipelines, onLoadMore } = usePipelineLoadMore({
    initialData,
    initialPageToken,
    sortDirection,
    sortField,
    loaded,
    filter,
  });

  const toggleRef = React.useRef(null);
  const menuRef = React.useRef(null);

  const menu = (
    <Menu data-id="pipeline-selector-menu" ref={menuRef} isScrollable>
      <MenuContent>
        <MenuSearch>
          <MenuSearchInput>
            <SearchInput {...searchProps} aria-label="Filter pipelines" />
          </MenuSearchInput>
          <HelperText>
            <HelperTextItem variant="indeterminate">{`Type a name to search your ${totalSize} pipelines.`}</HelperTextItem>
          </HelperText>
        </MenuSearch>
        <MenuList>
          <div role="menuitem">
            <TableBase
              itemCount={fetchedSize}
              loading={!loaded}
              data-id="pipeline-selector-table-list"
              emptyTableView={
                <EmptyTableView
                  hasIcon={false}
                  onClearFilters={onClear}
                  variant={EmptyStateVariant.xs}
                />
              }
              borders={false}
              variant={TableVariant.compact}
              columns={pipelineSelectorColumns}
              data={pipelines}
              rowRenderer={(row) => (
                <PipelineSelectorTableRow
                  key={row.id}
                  obj={row}
                  onClick={() => {
                    onSelect(row);
                    setOpen(false);
                  }}
                />
              )}
              getColumnSort={getTableColumnSort({
                columns: pipelineSelectorColumns,
                ...sortProps,
              })}
              footerRow={() =>
                loaded ? (
                  <PipelineViewMoreFooterRow
                    visibleLength={pipelines.length}
                    totalSize={fetchedSize}
                    errorTitle="Error loading more pipelines"
                    onClick={onLoadMore}
                    colSpan={2}
                  />
                ) : null
              }
            />
          </div>
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
          id="pipeline-selector"
          icon={
            !initialLoaded && (
              <Icon>
                <Spinner size="sm" aria-label="Loading pipelines" />
              </Icon>
            )
          }
          ref={toggleRef}
          onClick={() => setOpen(!isOpen)}
          isExpanded={isOpen}
          isDisabled={totalSize === 0}
          isFullWidth
          data-testid="pipeline-toggle-button"
        >
          {initialLoaded
            ? selection || (totalSize === 0 ? 'No pipelines available' : 'Select a pipeline')
            : 'Loading pipelines'}
        </MenuToggle>
      }
      menu={menu}
      menuRef={menuRef}
      popperProps={{ maxWidth: 'trigger' }}
      onOpenChange={(open) => setOpen(open)}
    />
  );
};

export default PipelineSelector;
