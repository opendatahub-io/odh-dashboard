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
import useDebounceCallback from '~/utilities/useDebounceCallback';
import PipelineSelectorTableRow from '~/concepts/pipelines/content/pipelineSelector/PipelineSelectorTableRow';
import { Table } from '~/components/table';
import { PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import { pipelineVersionSelectorColumns } from '~/concepts/pipelines/content/pipelineSelector/columns';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';

type CustomPipelineVersionSelectProps = {
  versions: PipelineVersionKFv2[];
  selection: string | undefined;
  onSelect: (version: PipelineVersionKFv2) => void;
};

/**
 * Select dropdown with custom list of versions, which uses client-side sorting & filtering. This component
 * should mimic the presentation of PipelineVersionSelector for a consistent user experience.
 */
const CustomPipelineVersionSelect: React.FC<CustomPipelineVersionSelectProps> = ({
  versions,
  selection,
  onSelect,
}) => {
  const [isOpen, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [filteredVersions, setFilteredVersions] = React.useState<PipelineVersionKFv2[]>(versions);
  const [visibleLength, setVisibleLength] = React.useState(10);
  const placeholder = versions.length === 0 ? 'No versions available' : 'Select a pipeline version';

  const toggleRef = React.useRef(null);
  const menuRef = React.useRef(null);

  const doSetSearchDebounced = useDebounceCallback(setSearch);

  React.useEffect(() => {
    if (search) {
      setFilteredVersions(
        versions.filter((option) =>
          option.display_name.toLowerCase().includes(search.toLowerCase()),
        ),
      );
    } else {
      setFilteredVersions(versions);
    }
    setVisibleLength(10);
  }, [search, versions]);

  const menu = (
    <Menu data-id="pipeline-version-selector-menu" ref={menuRef} isScrollable>
      <MenuContent>
        <MenuSearch>
          <MenuSearchInput>
            <SearchInput
              value={search}
              aria-label="Filter pipeline versions"
              onChange={(_event, value) => doSetSearchDebounced(value)}
            />
          </MenuSearchInput>
          <HelperText>
            <HelperTextItem variant="indeterminate">{`Type a name to search your ${versions.length} versions.`}</HelperTextItem>
          </HelperText>
        </MenuSearch>
        <MenuList>
          <div role="menuitem">
            <Table
              data-id="pipeline-version-selector-table-list"
              emptyTableView={
                <DashboardEmptyTableView
                  hasIcon={false}
                  onClearFilters={() => setSearch('')}
                  variant={EmptyStateVariant.xs}
                />
              }
              borders={false}
              variant="compact"
              columns={pipelineVersionSelectorColumns}
              data={filteredVersions}
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
          {visibleLength < filteredVersions.length && (
            <MenuItem
              isLoadButton
              onClick={(e) => {
                e.stopPropagation();
                setVisibleLength((length) => length + 10);
              }}
            >
              <>
                View more
                <Badge isRead>{`Showing ${visibleLength}/${filteredVersions.length}`}</Badge>
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
          id="pipeline-version-selector"
          ref={toggleRef}
          style={{ minWidth: '300px' }}
          onClick={() => setOpen(!isOpen)}
          isExpanded={isOpen}
          isDisabled={!versions.length}
          isFullWidth
          data-testid="pipeline-version-toggle-button"
        >
          {selection || placeholder}
        </MenuToggle>
      }
      menu={menu}
      menuRef={menuRef}
      popperProps={{ maxWidth: 'trigger' }}
      onOpenChange={(open) => setOpen(open)}
    />
  );
};

export default CustomPipelineVersionSelect;
