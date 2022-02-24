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

type DataProjectsHeaderToolbarProps = {
  viewType: string;
  updateViewType: (updatedType: string) => void;
};

const DataProjectsHeaderToolbar: React.FC<DataProjectsHeaderToolbarProps> = ({
  viewType,
  updateViewType,
}) => {
  const [optionSelection, setOptionSelection] = React.useState();
  const [isOptionsDropdownOpen, setIsOptionsDropdownOpen] = React.useState(false);
  const [resourceSelection, setResourceSelection] = React.useState();
  const [isResourcesDropdownOpen, setIsResourcesDropdownOpen] = React.useState(false);
  const [searchInputValue, setSearchInputValue] = React.useState('');

  const onOptionSelect = (event, selection) => {
    setOptionSelection(selection);
    setIsOptionsDropdownOpen(false);
  };
  const optionsDropdownItems = [
    <SelectOption key={1} value="Option 1" />,
    <SelectOption key={2} value="Option 2" />,
  ];

  const onResourceSelect = (event, selection) => {
    setResourceSelection(selection);
    setIsResourcesDropdownOpen(false);
  };
  const resourcesDropdownItems = [
    <SelectOption key={3} value="Resource 1" />,
    <SelectOption key={4} value="Resource 2" />,
  ];

  const onSearchInputChange = (value) => {
    setSearchInputValue(value);
  };

  return (
    <div className="odh-data-projects__toolbar m-no-padding">
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <Select
              aria-label="Select options"
              isOpen={isOptionsDropdownOpen}
              selections={optionSelection}
              onToggle={(isEnabled) => setIsOptionsDropdownOpen(isEnabled)}
              placeholderText="Select options"
              onSelect={onOptionSelect}
            >
              {optionsDropdownItems}
            </Select>
          </ToolbarItem>
          <ToolbarItem>
            <Select
              aria-label="Filter by resource"
              isOpen={isResourcesDropdownOpen}
              selections={resourceSelection}
              onToggle={(isEnabled) => setIsResourcesDropdownOpen(isEnabled)}
              placeholderText="Filter by resource"
              onSelect={onResourceSelect}
            >
              {resourcesDropdownItems}
            </Select>
          </ToolbarItem>
          <ToolbarItem>
            <SearchInput
              placeholder="Find by name"
              value={searchInputValue}
              onChange={onSearchInputChange}
              onClear={() => onSearchInputChange('')}
            />
          </ToolbarItem>
          <ToolbarItem alignment={{ default: 'alignRight' }}>
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
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
    </div>
  );
};

export default DataProjectsHeaderToolbar;
