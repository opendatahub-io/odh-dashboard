import * as React from 'react';
import { SearchInput, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import FilterToolbar from '~/components/FilterToolbar';
import ServeModelButton from './ServeModelButton';
import { Options, DashboardFilterDataType, options } from './const';

type DashboardToolbarProps = {
  filterData: DashboardFilterDataType;
  onFilterUpdate: (key: string, value?: string | { label: string; value: string }) => void;
};

const InferenceServiceToolbar: React.FC<DashboardToolbarProps> = ({
  filterData,
  onFilterUpdate,
}) => {
  return (
    <FilterToolbar<keyof typeof options>
      data-testid="dashboard-table-toolbar"
      filterOptions={options}
      filterOptionRenders={{
        [Options.name]: ({ onChange, ...props }) => (
          <SearchInput
            {...props}
            aria-label="Filter by name"
            placeholder="Filter by name"
            onChange={(_event, value) => onChange(value)}
          />
        ),
        [Options.project]: ({ onChange, ...props }) => (
          <SearchInput
            {...props}
            aria-label="Filter by project"
            placeholder="Filter by project"
            onChange={(_event, value) => onChange(value)}
          />
        ),
      }}
      filterData={filterData}
      onFilterUpdate={onFilterUpdate}
    >
      <ToolbarGroup>
        <ToolbarItem>
          <ServeModelButton />
        </ToolbarItem>
      </ToolbarGroup>
    </FilterToolbar>
  );
};

export default InferenceServiceToolbar;
