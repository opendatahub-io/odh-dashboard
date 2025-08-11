import * as React from 'react';
import { SearchInput, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/internal/components/FilterToolbar';
import {
  TrainingJobToolbarFilterOptions,
  TrainingJobFilterDataType,
  TrainingJobFilterOptions,
} from './const';

type TrainingJobToolbarProps = {
  filterData: TrainingJobFilterDataType;
  onFilterUpdate: (key: string, value?: string | { label: string; value: string }) => void;
};

const TrainingJobToolbar: React.FC<TrainingJobToolbarProps> = ({ filterData, onFilterUpdate }) => (
  <FilterToolbar<keyof typeof TrainingJobFilterOptions>
    data-testid="training-job-table-toolbar"
    filterOptions={TrainingJobFilterOptions}
    filterOptionRenders={{
      [TrainingJobToolbarFilterOptions.name]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          aria-label="Filter by name"
          placeholder="Filter by name"
          onChange={(_event, value) => onChange(value)}
        />
      ),
      [TrainingJobToolbarFilterOptions.clusterQueue]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          aria-label="Filter by cluster queue"
          placeholder="Filter by queue"
          onChange={(_event, value) => onChange(value)}
        />
      ),
      [TrainingJobToolbarFilterOptions.status]: ({ onChange, ...props }) => (
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
  >
    <ToolbarGroup>
      <ToolbarItem>
        {/* TODO: Add create training job button when needed */}
        {/* <CreateTrainingJobButton /> */}
      </ToolbarItem>
    </ToolbarGroup>
  </FilterToolbar>
);

export default TrainingJobToolbar;
