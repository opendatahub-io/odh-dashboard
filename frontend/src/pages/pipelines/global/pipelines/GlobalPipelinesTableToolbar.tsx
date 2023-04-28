import * as React from 'react';
import { DatePicker, TextInput, ToolbarItem } from '@patternfly/react-core';
import ImportPipelineButton from '~/concepts/pipelines/content/import/ImportPipelineButton';
import PipelineFilterBar from '~/concepts/pipelines/content/tables/PipelineFilterBar';

export enum FilterType {
  PIPELINE_NAME = 'Pipeline name',
  CREATED_ON = 'Created on',
}
export type FilterData = Record<FilterType, string>;

type GlobalPipelinesTableToolbarProps = {
  filterData: FilterData;
  onFilterUpdate: (filterType: FilterType, value: string) => void;
  onClearFilters: () => void;
};

const GlobalPipelinesTableToolbar: React.FC<GlobalPipelinesTableToolbarProps> = ({
  filterData,
  onFilterUpdate,
  onClearFilters,
}) => (
  <PipelineFilterBar
    filterOptions={FilterType}
    filterOptionRenders={{
      [FilterType.PIPELINE_NAME]: (props) => (
        <TextInput {...props} aria-label="Search for a pipeline name" placeholder="Name" />
      ),
      [FilterType.CREATED_ON]: ({ onChange, ...props }) => (
        <DatePicker
          {...props}
          aria-label="Select a creation date"
          onChange={(event, value) => onChange(value)}
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
