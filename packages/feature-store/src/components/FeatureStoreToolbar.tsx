import * as React from 'react';
import { SearchInput } from '@patternfly/react-core';
import DashboardDatePicker from '@odh-dashboard/internal/components/DashboardDatePicker';
import FeatureStoreFilterToolbar from './FeatureStoreFilterToolbar';
import { BaseFilterOptionRenders } from '../types/toolbarTypes';

export type FilterOptionRenders = BaseFilterOptionRenders & {
  'aria-label'?: string;
  placeholder?: string;
};

export type TagFilterProps = {
  tagFilters: string[];
  onTagFilterRemove: (tag: string) => void;
  onTagFilterAdd: (tag: string) => void;
};

export type BaseFeatureStoreToolbarProps = {
  filterOptions: Record<string, string>;
  filterData: Record<string, string | { label: string; value: string } | undefined>;
  onFilterUpdate: (key: string, value?: string | { label: string; value: string }) => void;
  children?: React.ReactNode;
  currentFilterType?: string;
  onFilterTypeChange?: (filterType: string) => void;
};

export type FeatureStoreToolbarProps = BaseFeatureStoreToolbarProps & Partial<TagFilterProps>;

const TagMultiInput: React.FC<{
  tagFilters?: string[];
  onTagFilterAdd?: (tag: string) => void;
  onChange: (value?: string, label?: string) => void;
  value?: string;
}> = ({ tagFilters = [], onTagFilterAdd, onChange, value }) => {
  const [localValue, setLocalValue] = React.useState(value || '');
  React.useEffect(() => {
    if (value === undefined || value === '') {
      setLocalValue('');
    }
  }, [value]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && localValue.trim()) {
      event.preventDefault();
      const newTag = localValue.trim();
      if (!tagFilters.includes(newTag)) {
        onTagFilterAdd?.(newTag);
        setLocalValue('');
        onChange('');
      }
    }
  };

  const handleInputChange = (_event: React.FormEvent<HTMLInputElement>, newValue: string) => {
    setLocalValue(newValue);
  };

  return (
    <SearchInput
      value={localValue}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      placeholder="Filter tags or press enter to add tag"
      aria-label="Search or add tag filter"
    />
  );
};

export function createDefaultFilterOptionRenders(
  filterOptions: Record<string, string>,
  tagFilters?: string[],
  onTagFilterAdd?: (tag: string) => void,
): Record<string, (props: FilterOptionRenders) => React.ReactNode> {
  const result: Record<string, (props: FilterOptionRenders) => React.ReactNode> = {};
  for (const key of Object.keys(filterOptions)) {
    if (key === 'tag' && tagFilters && onTagFilterAdd) {
      result[key] = (props) => (
        <TagMultiInput
          tagFilters={tagFilters}
          onTagFilterAdd={onTagFilterAdd}
          onChange={props.onChange}
          value={props.value}
        />
      );
    } else if (key === 'created' || key === 'updated') {
      result[key] = ({ onChange, ...props }) => (
        <DashboardDatePicker
          {...props}
          hideError
          aria-label={`Select a ${key} date`}
          onChange={(_, value, date) => {
            if (date || !value) {
              onChange(value);
            }
          }}
        />
      );
    } else {
      result[key] = ({ onChange, value, ...props }) => (
        <SearchInput
          {...props}
          value={value || ''}
          onChange={(_event, v) => onChange(v)}
          placeholder={`Filter by ${filterOptions[key].toLowerCase()}`}
        />
      );
    }
  }
  return result;
}

export function FeatureStoreToolbar({
  filterOptions,
  filterData,
  onFilterUpdate,
  children,
  currentFilterType,
  onFilterTypeChange,
  tagFilters = [],
  onTagFilterRemove,
  onTagFilterAdd,
}: FeatureStoreToolbarProps): JSX.Element {
  const filterOptionRenders = React.useMemo(
    () => createDefaultFilterOptionRenders(filterOptions, tagFilters, onTagFilterAdd),
    [filterOptions, tagFilters, onTagFilterAdd],
  );

  const multipleLabels = React.useMemo(() => {
    if (tagFilters.length === 0) {
      return undefined;
    }

    return {
      tag: tagFilters.map((tag, index) => ({
        key: `tag-${index}`,
        label: tag,
        testId: `tag-filter-chip-${tag.replace(/[^a-zA-Z0-9]/g, '-')}`,
        onRemove: () => onTagFilterRemove?.(tag),
      })),
    };
  }, [tagFilters, onTagFilterRemove]);

  const customOnFilterUpdate = React.useCallback(
    (key: string, value?: string | { label: string; value: string }) => {
      onFilterUpdate(key, value);
    },
    [onFilterUpdate],
  );

  return (
    <FeatureStoreFilterToolbar<keyof typeof filterOptions>
      data-testid="feature-store-table-toolbar"
      filterOptions={filterOptions}
      filterOptionRenders={filterOptionRenders}
      filterData={filterData}
      onFilterUpdate={customOnFilterUpdate}
      currentFilterType={currentFilterType}
      onFilterTypeChange={onFilterTypeChange}
      multipleLabels={multipleLabels}
    >
      {children}
    </FeatureStoreFilterToolbar>
  );
}
