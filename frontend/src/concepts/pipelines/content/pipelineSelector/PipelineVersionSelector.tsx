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
import { PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import { pipelineVersionSelectorColumns } from '~/concepts/pipelines/content/pipelineSelector/columns';
import PipelineViewMoreFooterRow from '~/concepts/pipelines/content/tables/PipelineViewMoreFooterRow';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import usePipelineVersionSelector from '~/concepts/pipelines/content/pipelineSelector/usePipelineVersionSelector';
import { isArgoWorkflow } from '~/concepts/pipelines/content/tables/utils';

type PipelineVersionSelectorProps = {
  pipelineId?: string;
  selection?: string;
  isCreatePage?: boolean;
  onSelect: (version: PipelineVersionKFv2) => void;
};

const PipelineVersionSelector: React.FC<PipelineVersionSelectorProps> = ({
  pipelineId,
  selection,
  isCreatePage,
  onSelect,
}) => {
  const [isOpen, setOpen] = React.useState(false);

  const toggleRef = React.useRef(null);
  const menuRef = React.useRef(null);

  const {
    fetchedSize,
    totalSize,
    searchProps,
    onSearchClear,
    onLoadMore,
    sortProps,
    loaded,
    initialLoaded,
    data: versions,
  } = usePipelineVersionSelector(pipelineId);

  // Only filter the unsupported version for create page.
  const supportedVersions = React.useMemo(
    () => (isCreatePage ? versions.filter((v) => !isArgoWorkflow(v.pipeline_spec)) : versions),
    [versions, isCreatePage],
  );
  const supportedVersionsSize = supportedVersions.length;

  const menu = (
    <Menu data-id="pipeline-version-selector-menu" ref={menuRef} isScrollable>
      <MenuContent>
        <MenuSearch>
          <MenuSearchInput>
            <SearchInput
              {...searchProps}
              onClear={onSearchClear}
              aria-label="Filter pipeline versions"
            />
          </MenuSearchInput>
          <HelperText>
            <HelperTextItem variant="indeterminate">{`Type a name to search your ${supportedVersionsSize} versions.`}</HelperTextItem>
          </HelperText>
        </MenuSearch>
        <MenuList>
          <div role="menuitem">
            <TableBase
              itemCount={fetchedSize}
              loading={!loaded}
              data-testid="pipeline-version-selector-table-list"
              emptyTableView={
                <DashboardEmptyTableView
                  hasIcon={false}
                  onClearFilters={onSearchClear}
                  variant={EmptyStateVariant.xs}
                />
              }
              borders={false}
              variant={TableVariant.compact}
              columns={pipelineVersionSelectorColumns}
              data={supportedVersions}
              rowRenderer={(row) => (
                <PipelineSelectorTableRow
                  key={row.pipeline_version_id}
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
          isDisabled={!pipelineId || totalSize === 0 || supportedVersionsSize === 0}
          isFullWidth
          data-testid="pipeline-version-toggle-button"
        >
          {!pipelineId
            ? 'Select a pipeline version'
            : initialLoaded
            ? selection ||
              (totalSize === 0
                ? 'No versions available'
                : supportedVersionsSize === 0
                ? 'No supported versions available'
                : 'Select a pipeline version')
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
