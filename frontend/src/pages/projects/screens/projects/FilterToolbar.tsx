import * as React from 'react';
import { SearchInput, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';

type FilterToolbarProps = {
  search: string;
  setSearch: (newSearch: string) => void;
};

const FilterToolbar: React.FC<FilterToolbarProps> = ({ search, setSearch }) => {
  return (
    <Toolbar>
      <ToolbarContent>
        <ToolbarItem>
          <SearchInput
            placeholder="Find by name"
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
          />
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};

export default FilterToolbar;
