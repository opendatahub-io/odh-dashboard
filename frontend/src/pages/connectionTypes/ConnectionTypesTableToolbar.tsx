import { Button, TextInput, ToolbarItem } from '@patternfly/react-core';
import React from 'react';
import { Link } from 'react-router-dom';
import FilterToolbar from '~/components/FilterToolbar';
import { ConnectionTypesOptions, FilterDataType, options } from '~/pages/connectionTypes/const';

type Props = {
  filterData: Record<ConnectionTypesOptions, string | undefined>;
  setFilterData: React.Dispatch<React.SetStateAction<FilterDataType>>;
  onClearFilters: () => void;
};

const ConnectionTypesTableToolbar: React.FC<Props> = ({
  setFilterData,
  filterData,
  onClearFilters,
}) => {
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
          <TextInput
            {...props}
            aria-label="Filter by keyword"
            placeholder="Filter by keyword"
            onChange={(_event, value) => onChange(value)}
          />
        ),
        [ConnectionTypesOptions.createdBy]: ({ onChange, ...props }) => (
          <TextInput
            {...props}
            aria-label="Created by"
            placeholder="Created by"
            onChange={(_event, value) => onChange(value)}
          />
        ),
      }}
      filterData={filterData}
      onClearFilters={onClearFilters}
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
