import * as React from 'react';
import { SearchInput } from '@patternfly/react-core';
import FilterToolbar from '#~/components/FilterToolbar';
import { FeatureFilterDataType, FeatureToolbarFilterOptions } from './const';

type FeaturesToolbarProps = {
  filterData: FeatureFilterDataType;
  onFilterUpdate: (key: string, value?: string | { label: string; value: string }) => void;
  filterOptions: Partial<Record<FeatureToolbarFilterOptions, string>>;
};

const FeaturesToolbar: React.FC<FeaturesToolbarProps> = ({
  filterData,
  onFilterUpdate,
  filterOptions,
}) => (
  <FilterToolbar<keyof typeof filterOptions>
    data-testid="feature-table-toolbar"
    filterOptions={filterOptions}
    filterOptionRenders={{
      [FeatureToolbarFilterOptions.feature]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          aria-label="Filter by feature"
          placeholder="Filter by feature"
          onChange={(_event, value) => onChange(value)}
        />
      ),
      [FeatureToolbarFilterOptions.project]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          aria-label="Filter by project"
          placeholder="Filter by project"
          onChange={(_event, value) => onChange(value)}
        />
      ),
      [FeatureToolbarFilterOptions.tags]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          aria-label="Filter by tags"
          placeholder="Filter by tags"
          onChange={(_event, value) => onChange(value)}
        />
      ),
      [FeatureToolbarFilterOptions.valueType]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          aria-label="Filter by value type"
          placeholder="Filter by value type"
          onChange={(_event, value) => onChange(value)}
        />
      ),
      [FeatureToolbarFilterOptions.featureView]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          aria-label="Filter by feature view"
          placeholder="Filter by feature view"
          onChange={(_event, value) => onChange(value)}
        />
      ),
      [FeatureToolbarFilterOptions.owner]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          aria-label="Filter by owner"
          placeholder="Filter by owner"
          onChange={(_event, value) => onChange(value)}
        />
      ),
    }}
    filterData={filterData}
    onFilterUpdate={onFilterUpdate}
  />
);

export default FeaturesToolbar;
