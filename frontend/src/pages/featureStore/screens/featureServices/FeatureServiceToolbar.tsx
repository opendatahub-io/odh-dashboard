import * as React from 'react';
import { SearchInput } from '@patternfly/react-core';
import FilterToolbar from '#~/components/FilterToolbar';
import {
  FeatureServiceFilterDataType,
  FeatureServiceFilterOptions,
  FeatureServiceToolbarFilterOptions,
} from './const';

type FeatureServiceToolbarProps = {
  filterData: FeatureServiceFilterDataType;
  onFilterUpdate: (key: string, value?: string | { label: string; value: string }) => void;
};

const FeatureServiceToolbar: React.FC<FeatureServiceToolbarProps> = ({
  filterData,
  onFilterUpdate,
}) => (
  <FilterToolbar<keyof typeof FeatureServiceFilterOptions>
    data-testid="feature-service-table-toolbar"
    filterOptions={FeatureServiceFilterOptions}
    filterOptionRenders={{
      [FeatureServiceToolbarFilterOptions.featureService]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          aria-label="Filter by feature service"
          placeholder="Filter by feature service"
          onChange={(_event, value) => onChange(value)}
        />
      ),
      [FeatureServiceToolbarFilterOptions.tags]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          aria-label="Filter by tags"
          placeholder="Filter by tags"
          onChange={(_event, value) => onChange(value)}
        />
      ),
    }}
    filterData={filterData}
    onFilterUpdate={onFilterUpdate}
  />
);

export default FeatureServiceToolbar;
