import * as React from 'react';
import { SearchInput } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/ui-core/components/FilterToolbar';
import {
  ExternalModelsFilterDataType,
  externalModelsFilterOptions,
  ExternalModelsFilterOptions,
} from './const';

type ExternalModelsToolBarProps = {
  filterData: ExternalModelsFilterDataType;
  onFilterUpdate: (
    key: ExternalModelsFilterOptions,
    value?: string | { label: string; value: string },
  ) => void;
};

const ExternalModelsToolBar: React.FC<ExternalModelsToolBarProps> = ({
  filterData,
  onFilterUpdate,
}) => (
  <FilterToolbar<ExternalModelsFilterOptions>
    data-testid="external-models-table-toolbar"
    filterOptions={externalModelsFilterOptions}
    filterOptionRenders={{
      [ExternalModelsFilterOptions.keyword]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          style={{ minWidth: '350px' }}
          aria-label="Filter by name, resource name, or description"
          placeholder="Filter by name, resource name, or description"
          onChange={(_event, value) => onChange(value)}
          data-testid="external-models-filter-input"
        />
      ),
    }}
    filterData={filterData}
    onFilterUpdate={onFilterUpdate}
  />
);

export default ExternalModelsToolBar;
