import * as React from 'react';
import { SearchInput } from '@patternfly/react-core';
import FilterToolbar from '#~/components/FilterToolbar';
import {
  FeatureViewFilterDataType,
  FeatureViewFilterOptions,
  FeatureViewToolbarFilterOptions,
} from './const';

type FeatureViewToolbarProps = {
  filterData: FeatureViewFilterDataType;
  onFilterUpdate: (key: string, value?: string | { label: string; value: string }) => void;
};

const FeatureViewToolbar: React.FC<FeatureViewToolbarProps> = ({ filterData, onFilterUpdate }) => (
  <FilterToolbar<keyof typeof FeatureViewFilterOptions>
    data-testid="feature-view-table-toolbar"
    filterOptions={FeatureViewFilterOptions}
    filterOptionRenders={{
      [FeatureViewToolbarFilterOptions.featureView]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          aria-label="Filter by feature view"
          placeholder="Filter by feature view"
          onChange={(_event, value) => onChange(value)}
        />
      ),
      [FeatureViewToolbarFilterOptions.tags]: ({ onChange, ...props }) => (
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

export default FeatureViewToolbar;
