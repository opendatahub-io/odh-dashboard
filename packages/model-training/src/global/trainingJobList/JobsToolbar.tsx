import * as React from 'react';
import { SearchInput } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/internal/components/FilterToolbar';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/internal/components/SimpleSelect';
import { JobsToolbarFilterOptions, JobsFilterDataType, JobsFilterOptions } from './const';
import { JobType } from '../../types';

const jobTypeFilterOptions: SimpleSelectOption[] = [
  { key: '', label: 'All' },
  { key: JobType.TRAIN_JOB, label: 'TrainJob' },
  { key: JobType.RAY_JOB, label: 'RayJob' },
];

type JobsToolbarProps = {
  filterData: JobsFilterDataType;
  onFilterUpdate: (key: string, value?: string | { label: string; value: string }) => void;
};

const JobsToolbar: React.FC<JobsToolbarProps> = ({ filterData, onFilterUpdate }) => (
  <FilterToolbar<keyof typeof JobsFilterOptions>
    testId="training-job-table-toolbar"
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
      [JobsToolbarFilterOptions.type]: ({ value, onChange, ...props }) => (
        <SimpleSelect
          {...props}
          dataTestId="training-job-type-filter-select"
          value={value ?? ''}
          placeholder="All"
          aria-label="Filter by type"
          options={jobTypeFilterOptions}
          onChange={(v) => onChange(v)}
          popperProps={{ maxWidth: undefined }}
        />
      ),
    }}
    filterData={filterData}
    onFilterUpdate={onFilterUpdate}
  />
);

export default JobsToolbar;
