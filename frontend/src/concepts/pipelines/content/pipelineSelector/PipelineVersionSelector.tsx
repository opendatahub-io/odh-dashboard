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
import { usePipelineVersionLoadMore } from '~/concepts/pipelines/content/tables/usePipelineLoadMore';
import { PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { pipelineVersionSelectorColumns } from '~/concepts/pipelines/content/pipelineSelector/columns';
import usePipelineVersionsTable from '~/concepts/pipelines/content/tables/pipelineVersion/usePipelineVersionsTable';
import PipelineViewMoreFooterRow from '~/concepts/pipelines/content/tables/PipelineViewMoreFooterRow';
import { useSelectorSearch } from '~/concepts/pipelines/content/pipelineSelector/utils';
import EmptyTableView from '~/concepts/pipelines/content/tables/EmptyTableView';
import { getTableSortProps } from '~/concepts/pipelines/content/tables/usePipelineTable';

type PipelineVersionSelectorProps = {
  pipelineId?: string;
  selection?: string;
  onSelect: (version: PipelineVersionKF) => void;
};

const PipelineVersionSelector: React.FC<PipelineVersionSelectorProps> = ({
  pipelineId,
  selection,
  onSelect,
}) => {
  const [isOpen, setOpen] = React.useState(false);

  const [
    [{ items: initialData, totalSize: fetchedSize, nextPageToken: initialPageToken }, loaded],
    { initialLoaded, ...tableProps },
  ] = usePipelineVersionsTable(pipelineId)();

  const toggleRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const sortProps = getTableSortProps(tableProps);
  const { sortDirection, sortField, setFilter, filter } = tableProps;
  const { data: versions, onLoadMore } = usePipelineVersionLoadMore({
    pipelineId,
    initialData,
    initialPageToken,
    sortDirection,
    sortField,
    filter,
    loaded,
  });

  const { totalSize, ...searchProps } = useSelectorSearch({ setFilter, fetchedSize, loaded });
  const { onClear } = searchProps;

  const menu = (
    <Menu data-id="pipeline-version-selector-menu" ref={menuRef} isScrollable>
      <MenuContent>
        <MenuSearch>
          <MenuSearchInput>
            <SearchInput {...searchProps} aria-label="Filter pipeline versions" />
          </MenuSearchInput>
          <HelperText>
            <HelperTextItem variant="indeterminate">{`Type a name to search your ${totalSize} versions.`}</HelperTextItem>
          </HelperText>
        </MenuSearch>
        <MenuList>
          <div role="menuitem">
            <TableBase
              itemCount={fetchedSize}
              loading={!loaded}
              data-id="pipeline-version-selector-table-list"
              emptyTableView={
                <EmptyTableView
                  hasIcon={false}
                  onClearFilters={onClear}
                  variant={EmptyStateVariant.xs}
                />
              }
              borders={false}
              variant={TableVariant.compact}
              columns={pipelineVersionSelectorColumns}
              data={versions}
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
                columns: pipelineVersionSelectorColumns,
                ...sortProps,
              })}
              footerRow={() =>
                loaded ? (
                  <PipelineViewMoreFooterRow
                    visibleLength={versions.length}
                    totalSize={fetchedSize}
                    errorTitle="Error loading more pipeline versions"
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
          id="pipeline-version-selector"
          icon={
            pipelineId &&
            !initialLoaded && (
              <Icon>
                <Spinner size="sm" aria-label="Loading pipeline versions" />
              </Icon>
            )
          }
          ref={toggleRef}
          onClick={() => setOpen(!isOpen)}
          isExpanded={isOpen}
          isDisabled={!pipelineId || totalSize === 0}
          isFullWidth
          data-testid="pipeline-version-toggle-button"
        >
          {!pipelineId
            ? 'Select a pipeline version'
            : initialLoaded
            ? selection || (totalSize === 0 ? 'No versions available' : 'Select a pipeline version')
            : 'Loading pipeline versions'}
        </MenuToggle>
      }
      menu={menu}
      menuRef={menuRef}
      popperProps={{ maxWidth: 'trigger' }}
      onOpenChange={(open) => setOpen(open)}
    />
  );
};

// TODO: refactor the modal across the app, only render it when it's open
// In that way we don't need the wrapper anymore
const PipelineVersionSelectorWrapper = (
  props: PipelineVersionSelectorProps,
): React.ReactElement => <PipelineVersionSelector key={props.pipelineId} {...props} />;

export default PipelineVersionSelectorWrapper;
