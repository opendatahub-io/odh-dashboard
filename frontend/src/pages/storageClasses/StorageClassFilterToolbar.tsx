import React from 'react';
import { SearchInput } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/ui-core/components/FilterToolbar';
import {
  StorageClassFilterData,
  StorageClassFilterOption,
  storageClassFilterOptions,
} from './constants';

interface StorageClassFilterToolbarProps {
  filterData: StorageClassFilterData;
  onFilterUpdate: (
    key: StorageClassFilterOption,
    value: string | { label: string; value: string } | undefined,
  ) => void;
}

export const StorageClassFilterToolbar: React.FC<StorageClassFilterToolbarProps> = ({
  filterData,
  onFilterUpdate,
}) => {
  return (
    <FilterToolbar<keyof typeof storageClassFilterOptions>
      data-testid="sc-table-toolbar"
      filterOptions={storageClassFilterOptions}
      filterOptionRenders={{
        [StorageClassFilterOption.DisplayName]: ({ onChange, ...props }) => (
          <SearchInput
            {...props}
            placeholder="Filter by display name"
            onChange={(_event, value) => onChange(value)}
          />
        ),
        [StorageClassFilterOption.OpenshiftScName]: ({ onChange, ...props }) => (
          <SearchInput
            {...props}
            placeholder="Filter by OpenShift storage class"
            onChange={(_event, value) => onChange(value)}
          />
        ),
      }}
      filterData={filterData}
      onFilterUpdate={onFilterUpdate}
    />
  );
};
