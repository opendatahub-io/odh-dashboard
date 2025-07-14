import { Button, SearchInput, ToolbarItem } from '@patternfly/react-core';
import React from 'react';
import { Link } from 'react-router-dom';
import FilterToolbar from '#~/components/FilterToolbar';
import { ConnectionTypesOptions, FilterDataType, options } from '#~/pages/connectionTypes/const';

type Props = {
  filterData: Record<ConnectionTypesOptions, string | undefined>;
  setFilterData: React.Dispatch<React.SetStateAction<FilterDataType>>;
};

const ConnectionTypesTableToolbar: React.FC<Props> = ({ setFilterData, filterData }) => {
  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  return (
    <FilterToolbar<keyof typeof options>
      data-testid="connection-types-table-toolbar"
      filterOptions={options}
      filterOptionRenders={{
        [ConnectionTypesOptions.keyword]: ({ onChange, ...props }) => (
          <SearchInput
            {...props}
            aria-label="Filter by keyword"
            placeholder="Filter by keyword"
            onChange={(_event, value) => onChange(value)}
          />
        ),
        [ConnectionTypesOptions.category]: ({ onChange, ...props }) => (
          <SearchInput
            {...props}
            aria-label="Filter by category"
            placeholder="Filter by category"
            onChange={(_event, value) => onChange(value)}
          />
        ),
        [ConnectionTypesOptions.creator]: ({ onChange, ...props }) => (
          <SearchInput
            {...props}
            aria-label="Creator"
            placeholder="Creator"
            onChange={(_event, value) => onChange(value)}
          />
        ),
      }}
      filterData={filterData}
      onFilterUpdate={onFilterUpdate}
    >
      <ToolbarItem>
        <Button
          data-testid="create-new-connection-type"
          variant="primary"
          component={(props) => <Link {...props} to="/connectionTypes/create" />}
        >
          Create connection type
        </Button>
      </ToolbarItem>
    </FilterToolbar>
  );
};

export default ConnectionTypesTableToolbar;
