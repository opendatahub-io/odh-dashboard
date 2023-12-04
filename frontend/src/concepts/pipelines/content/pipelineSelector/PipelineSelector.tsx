import * as React from 'react';
import {
  Badge,
  Bullseye,
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
  Skeleton,
} from '@patternfly/react-core';
import useDebounceCallback from '~/utilities/useDebounceCallback';
import PipelineSelectorTableRow from '~/concepts/pipelines/content/pipelineSelector/PipelineSelectorTableRow';
import { SortableData, Table } from '~/components/table';
import { PipelineKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';

type PipelineSelectorProps<DataType> = {
  name?: string;
  columns: SortableData<DataType>[];
  data: DataType[];
  placeHolder: string;
  searchHelperText: string;
  onSelect: (id: string) => void;
  isLoading: boolean;
  isDisabled?: boolean;
};

const PipelineSelector = <T extends PipelineKF | PipelineVersionKF>({
  name,
  columns,
  data,
  onSelect,
  isLoading,
  isDisabled,
  placeHolder,
  searchHelperText,
}: PipelineSelectorProps<T>) => {
  const [isOpen, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [filteredData, setFilteredData] = React.useState(data);
  const [visibleLength, setVisibleLength] = React.useState(10);

  const toggleRef = React.useRef(null);
  const menuRef = React.useRef(null);

  const doSetSearchDebounced = useDebounceCallback(setSearch);

  React.useEffect(() => {
    if (search) {
      setFilteredData(
        data.filter((option) => option.name.toLowerCase().includes(search.toLowerCase())),
      );
    } else {
      setFilteredData(data);
    }
    setVisibleLength(10);
  }, [search, data]);

  if (isLoading) {
    return <Skeleton />;
  }

  const menu = (
    <Menu data-id="pipeline-selector-menu" ref={menuRef} isScrollable>
      <MenuContent>
        <MenuSearch>
          <MenuSearchInput>
            <SearchInput
              value={search}
              aria-label="Filter pipelines"
              onChange={(_event, value) => doSetSearchDebounced(value)}
            />
          </MenuSearchInput>
          <HelperText>
            <HelperTextItem variant="indeterminate">{searchHelperText}</HelperTextItem>
          </HelperText>
        </MenuSearch>
        <MenuList>
          <div role="menuitem">
            <Table
              data-id="pipeline-selector-table-list"
              emptyTableView={<Bullseye>No results match the filter.</Bullseye>}
              borders={false}
              variant="compact"
              columns={columns}
              data={filteredData}
              truncateRenderingAt={visibleLength}
              rowRenderer={(row, index) => (
                <PipelineSelectorTableRow
                  key={index}
                  obj={row}
                  onClick={() => {
                    onSelect(row.id);
                    setOpen(false);
                  }}
                />
              )}
            />
          </div>
          {visibleLength < filteredData.length && (
            <MenuItem
              isLoadButton
              onClick={(e) => {
                // sometimes it will trigger onOpenChange function
                // because it misjudges the outside of the menu
                // use stopPropagation to prevent menu from closing
                e.stopPropagation();
                setVisibleLength((length) => length + 10);
              }}
            >
              <>
                View more <Badge isRead>{`Showing ${visibleLength}/${filteredData.length}`}</Badge>
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
          style={{ maxWidth: '500px' }}
          ref={toggleRef}
          onClick={() => setOpen(!isOpen)}
          isExpanded={isOpen}
          isDisabled={isDisabled || data.length === 0}
          isFullWidth
        >
          {name || placeHolder}
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
