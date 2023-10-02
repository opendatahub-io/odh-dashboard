import * as React from 'react';
import { TextInput, ToolbarItem } from '@patternfly/react-core';
import ImportPipelineButton from '~/concepts/pipelines/content/import/ImportPipelineButton';
import PipelineFilterBar from '~/concepts/pipelines/content/tables/PipelineFilterBar';
import { FilterOptions } from '~/concepts/pipelines/content/tables/usePipelineFilter';
import DashboardDatePicker from '~/components/DashboardDatePicker';

const options = {
  [FilterOptions.NAME]: 'Pipeline name',
  [FilterOptions.CREATED_AT]: 'Created on',
};

type GlobalPipelinesTableToolbarProps = Pick<
  React.ComponentProps<typeof PipelineFilterBar>,
  'filterData' | 'onFilterUpdate' | 'onClearFilters'
>;

const GlobalPipelinesTableToolbar: React.FC<GlobalPipelinesTableToolbarProps> = ({
  filterData,
  onFilterUpdate,
  onClearFilters,
}) => (
  <PipelineFilterBar<keyof typeof options>
    filterOptions={options}
    filterOptionRenders={{
      [FilterOptions.NAME]: ({ onChange, ...props }) => (
        <TextInput
          {...props}
          onChange={(value) => onChange(value)}
          aria-label="Search for a pipeline name"
          placeholder="Name"
        />
      ),
      [FilterOptions.CREATED_AT]: ({ onChange, ...props }) => (
        <DashboardDatePicker
          {...props}
          hideError
          aria-label="Select a creation date"
          onChange={(event, value, date) => {
            if (date || !value) {
              onChange(value);
            }
          }}
        />
      ),
    }}
    filterData={filterData}
    onFilterUpdate={onFilterUpdate}
    onClearFilters={onClearFilters}
  >
    <ToolbarItem>
      <ImportPipelineButton />
    </ToolbarItem>
  </PipelineFilterBar>
);

export default GlobalPipelinesTableToolbar;
