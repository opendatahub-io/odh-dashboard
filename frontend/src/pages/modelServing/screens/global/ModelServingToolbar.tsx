import * as React from 'react';
import { SearchInput, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import FilterToolbar from '#~/components/FilterToolbar';
import ServeModelButton from './ServeModelButton';
import {
  ModelServingToolbarFilterOptions,
  ModelServingFilterDataType,
  modelServingFilterOptions,
} from './const';

type ModelServingToolbarProps = {
  filterData: ModelServingFilterDataType;
  onFilterUpdate: (key: string, value?: string | { label: string; value: string }) => void;
};

const ModelServingToolbar: React.FC<ModelServingToolbarProps> = ({
  filterData,
  onFilterUpdate,
}) => (
  <FilterToolbar<keyof typeof modelServingFilterOptions>
    data-testid="model-serving-table-toolbar"
    filterOptions={modelServingFilterOptions}
    filterOptionRenders={{
      [ModelServingToolbarFilterOptions.name]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          aria-label="Filter by name"
          placeholder="Filter by name"
          onChange={(_event, value) => onChange(value)}
        />
      ),
      [ModelServingToolbarFilterOptions.project]: ({ onChange, ...props }) => (
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

export default ModelServingToolbar;
