import * as React from 'react';
import { SearchInput, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/internal/components/FilterToolbar';
import {
  ModelServingFilterDataType,
  modelServingFilterOptions,
  ModelServingToolbarFilterOptions,
} from '@odh-dashboard/internal/pages/modelServing/screens/global/const';
import { DeployButton } from '../deploy/DeployButton';

type GlobalModelsToolbarProps = {
  filterData: ModelServingFilterDataType;
  onFilterUpdate: (key: string, value?: string | { label: string; value: string }) => void;
};

const GlobalModelsToolbar: React.FC<GlobalModelsToolbarProps> = ({
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
        <DeployButton />
      </ToolbarItem>
    </ToolbarGroup>
  </FilterToolbar>
);

export default GlobalModelsToolbar;
