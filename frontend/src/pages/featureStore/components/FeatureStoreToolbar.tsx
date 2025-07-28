import * as React from 'react';
import { SearchInput } from '@patternfly/react-core';
import FilterToolbar from '#~/components/FilterToolbar.tsx';

export type FilterOptionRenders = {
  'aria-label'?: string;
  label?: string;
  onChange: (value?: string, label?: string) => void;
  placeholder?: string;
  value?: string;
};

export function createDefaultFilterOptionRenders(
  keys: string[],
): Record<string, (props: FilterOptionRenders) => React.ReactNode> {
  const result: Record<string, (props: FilterOptionRenders) => React.ReactNode> = {};
  for (const key of keys) {
    result[key] = ({ onChange, value, ...props }) => (
      <SearchInput {...props} value={value || ''} onChange={(_event, v) => onChange(v)} />
    );
  }
  return result;
}

export type FeatureStoreToolbarProps = {
  filterOptions: Record<string, string>;
  filterData: Record<string, string | { label: string; value: string } | undefined>;
  onFilterUpdate: (key: string, value?: string | { label: string; value: string }) => void;
  children?: React.ReactNode;
};

export function FeatureStoreToolbar({
  filterOptions,
  filterData,
  onFilterUpdate,
  children,
}: FeatureStoreToolbarProps): JSX.Element {
  const filterOptionRenders = React.useMemo(
    () => createDefaultFilterOptionRenders(Object.keys(filterOptions)),
    [filterOptions],
  );

  return (
    <div className="pf-v5-c-toolbar">
      <FilterToolbar<keyof typeof filterOptions>
        data-testid="feature-store-table-toolbar"
        filterOptions={filterOptions}
        filterOptionRenders={filterOptionRenders}
        filterData={filterData}
        onFilterUpdate={onFilterUpdate}
      >
        {children}
      </FilterToolbar>
    </div>
  );
}
