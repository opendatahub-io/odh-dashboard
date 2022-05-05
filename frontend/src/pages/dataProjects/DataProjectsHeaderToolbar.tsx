import * as React from 'react';
import {
  SearchInput,
  Select,
  SelectOption,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { TopologyIcon, ListIcon } from '@patternfly/react-icons';
import { TOPOLOGY_VIEW, LIST_VIEW } from './const';

import './DataProjectsToolbar.scss';
import { usePrevious } from '../../utilities/usePrevious';
import { FilterSelectOptionType, Project, ProjectsTableFilter } from '../../types';

type DataProjectsHeaderToolbarProps = {
  projects: Project[];
  filterArray: ProjectsTableFilter[];
  filterSelection: FilterSelectOptionType;
  setFilterSelection: (filter: FilterSelectOptionType) => void;
  filterSelectOption: (filter: ProjectsTableFilter) => FilterSelectOptionType;
  searchInputValue: string;
  setSearchInputValue: (value: string) => void;
  filterProjects: (projects: Project[], filter: ProjectsTableFilter, value: string) => void;
  viewType: string;
  updateViewType: (updatedType: string) => void;
};

const DataProjectsHeaderToolbar: React.FC<DataProjectsHeaderToolbarProps> = ({
  projects,
  filterArray,
  filterSelection,
  setFilterSelection,
  filterSelectOption,
  searchInputValue,
  setSearchInputValue,
  filterProjects,
  viewType,
  updateViewType,
}) => {
  const [isFilterDropdownOpen, setFilterDropdownOpen] = React.useState(false);
  const [searchInputPlaceholder, setSearchInputPlaceholder] = React.useState(filterArray[0]);
  const prevFilterSelection = usePrevious(filterSelection);

  React.useEffect(() => {
    if (prevFilterSelection && filterSelection.toString() !== prevFilterSelection.toString()) {
      setSearchInputValue('');
    }
  }, [filterSelection]);

  const onFilterSelect = (event, selection) => {
    setFilterSelection(selection);
    setFilterDropdownOpen(false);
    setSearchInputPlaceholder(selection.filter);
  };

  const filterDropdownItems = () => {
    return filterArray.map((filter, index) => (
      <SelectOption key={index} value={filterSelectOption(filter)} />
    ));
  };

  const onSearchInputChange = (value) => {
    setSearchInputValue(value);
    filterProjects(projects, filterSelection.filter, value);
  };

  return (
    <div className="odh-data-projects__toolbar m-no-padding">
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <Select
              aria-label="Filter by"
              isOpen={isFilterDropdownOpen}
              selections={filterSelection}
              onToggle={(isEnabled) => setFilterDropdownOpen(isEnabled)}
              onSelect={onFilterSelect}
            >
              {filterDropdownItems()}
            </Select>
          </ToolbarItem>
          <ToolbarItem>
            <SearchInput
              placeholder={searchInputPlaceholder}
              value={searchInputValue}
              onChange={onSearchInputChange}
              onClear={() => onSearchInputChange('')}
            />
          </ToolbarItem>
          {/* <ToolbarItem alignment={{ default: 'alignRight' }}>
            <ToggleGroup aria-label="View type">
              <ToggleGroupItem
                icon={<TopologyIcon />}
                aria-label="topology view"
                buttonId="topology-view"
                isSelected={viewType === TOPOLOGY_VIEW}
                onChange={() => updateViewType(TOPOLOGY_VIEW)}
              />
              <ToggleGroupItem
                icon={<ListIcon />}
                aria-label="listview"
                buttonId="list-view"
                isSelected={viewType === LIST_VIEW}
                onChange={() => updateViewType(LIST_VIEW)}
              />
            </ToggleGroup>
          </ToolbarItem> */}
        </ToolbarContent>
      </Toolbar>
    </div>
  );
};

export default DataProjectsHeaderToolbar;
