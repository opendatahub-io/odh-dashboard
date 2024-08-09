import { TextInput } from '@patternfly/react-core';
import React from 'react';
import { FilterToolbar } from '~/concepts/pipelines/content/tables/PipelineFilterBar';
import { ConnectionTypesOptions, FilterDataType, options } from '~/pages/connectionTypes/const';

type ConnectionTypesTableToolbarProps = {
  filterData: Record<ConnectionTypesOptions, string | undefined>;
  setFilterData: React.Dispatch<React.SetStateAction<FilterDataType>>;
  onClearFilters: () => void;
};

const ConnectionTypesTableToolbar: React.FC<ConnectionTypesTableToolbarProps> = ({
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
    />
  );
};

export default ConnectionTypesTableToolbar;
