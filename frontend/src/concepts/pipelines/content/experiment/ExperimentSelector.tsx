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
import { ExperimentKFv2 } from '~/concepts/pipelines/kfTypes';
import PipelineViewMoreFooterRow from '~/concepts/pipelines/content/tables/PipelineViewMoreFooterRow';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import {
  useActiveExperimentSelector,
  useAllExperimentSelector,
} from '~/concepts/pipelines/content/pipelineSelector/useCreateSelectors';
import { experimentSelectorColumns } from '~/concepts/pipelines/content/experiment/columns';

type ExperimentSelectorProps = {
  selection?: string;
  onSelect: (experiment: ExperimentKFv2) => void;
};

const InnerExperimentSelector: React.FC<
  ReturnType<typeof useAllExperimentSelector> & ExperimentSelectorProps
> = ({
  fetchedSize,
  totalSize,
  searchProps,
  onSearchClear,
  onLoadMore,
  sortProps,
  loaded,
  initialLoaded,
  data: experiments,
  selection,
  onSelect,
}) => {
  const [isOpen, setOpen] = React.useState(false);

  const toggleRef = React.useRef(null);
  const menuRef = React.useRef(null);

  const menu = (
    <Menu ref={menuRef} isScrollable>
      <MenuContent>
        <MenuSearch>
          <MenuSearchInput>
            <SearchInput {...searchProps} aria-label="Filter experiments" />
          </MenuSearchInput>
          <HelperText>
            <HelperTextItem variant="indeterminate">{`Type a name to search your ${totalSize} experiments.`}</HelperTextItem>
          </HelperText>
        </MenuSearch>
        <MenuList>
          <div role="menuitem">
            <TableBase
              itemCount={fetchedSize}
              loading={!loaded}
              emptyTableView={
                <DashboardEmptyTableView
                  hasIcon={false}
                  onClearFilters={onSearchClear}
                  variant={EmptyStateVariant.xs}
                />
              }
              data-testid="experiment-selector-table-list"
              borders={false}
              variant={TableVariant.compact}
              columns={experimentSelectorColumns}
              data={experiments}
              rowRenderer={(row) => (
                <PipelineSelectorTableRow
                  key={row.experiment_id}
                  obj={row}
                  onClick={() => {
                    onSelect(row);
                    setOpen(false);
                  }}
                />
              )}
              getColumnSort={getTableColumnSort({
                columns: experimentSelectorColumns,
                ...sortProps,
              })}
              footerRow={() =>
                loaded ? (
                  <PipelineViewMoreFooterRow
                    visibleLength={experiments.length}
                    totalSize={fetchedSize}
                    errorTitle="Error loading more experiments"
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
          id="experiment-selector"
          icon={
            !initialLoaded && (
              <Icon>
                <Spinner size="sm" aria-label="Loading experiments" />
              </Icon>
            )
          }
          ref={toggleRef}
          onClick={() => setOpen(!isOpen)}
          isExpanded={isOpen}
          isDisabled={totalSize === 0}
          isFullWidth
          data-testid="experiment-toggle-button"
        >
          {initialLoaded
            ? selection || (totalSize === 0 ? 'No experiments available' : 'Select an experiment')
            : 'Loading experiments'}
        </MenuToggle>
      }
      menu={menu}
      menuRef={menuRef}
      popperProps={{ maxWidth: 'trigger' }}
      onOpenChange={(open) => setOpen(open)}
    />
  );
};

export const AllExperimentSelector: React.FC<ExperimentSelectorProps> = (props) => {
  const selectorProps = useAllExperimentSelector();
  return <InnerExperimentSelector {...props} {...selectorProps} />;
};

export const ActiveExperimentSelector: React.FC<ExperimentSelectorProps> = (props) => {
  const selectorProps = useActiveExperimentSelector();
  return <InnerExperimentSelector {...props} {...selectorProps} />;
};
