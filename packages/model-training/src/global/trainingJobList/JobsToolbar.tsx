import * as React from 'react';
import { SearchInput } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/internal/components/FilterToolbar';
import { JobsToolbarFilterOptions, JobsFilterDataType, JobsFilterOptions } from './const';

type JobsToolbarProps = {
  filterData: JobsFilterDataType;
  onFilterUpdate: (key: string, value?: string | { label: string; value: string }) => void;
};

const JobsToolbar: React.FC<JobsToolbarProps> = ({ filterData, onFilterUpdate }) => (
  <FilterToolbar<keyof typeof JobsFilterOptions>
    data-testid="training-job-table-toolbar"
    filterOptions={JobsFilterOptions}
    filterOptionRenders={{
      [JobsToolbarFilterOptions.name]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          aria-label="Filter by name"
          placeholder="Filter by name"
          onChange={(_event, value) => onChange(value)}
        />
      ),
      [JobsToolbarFilterOptions.clusterQueue]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          aria-label="Filter by cluster queue"
          placeholder="Filter by queue"
          onChange={(_event, value) => onChange(value)}
        />
      ),
      [JobsToolbarFilterOptions.status]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          aria-label="Filter by status"
          placeholder="Filter by status"
          onChange={(_event, value) => onChange(value)}
        />
      ),
    }}
    filterData={filterData}
    onFilterUpdate={onFilterUpdate}
  />
);

export default JobsToolbar;
