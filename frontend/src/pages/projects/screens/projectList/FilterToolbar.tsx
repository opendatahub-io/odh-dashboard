import * as React from 'react';
import { Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import FilterProjectDropdown from './FilterProjectDropdown';
import SearchProjectField from './SearchProjectField';

type FilterToolbarProps = {};

const FilterToolbar: React.FC<FilterToolbarProps> = (props) => {
  return (
    <Toolbar>
      <ToolbarContent>
        <ToolbarItem>
          <FilterProjectDropdown />
        </ToolbarItem>
        <ToolbarItem>
          <SearchProjectField />
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};

export default FilterToolbar;
