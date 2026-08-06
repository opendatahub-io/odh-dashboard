import * as React from 'react';
import { SearchInput } from '@patternfly/react-core';
import DashboardDatePicker from '@odh-dashboard/internal/components/DashboardDatePicker';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import FeatureStoreFilterToolbar from './FeatureStoreFilterToolbar';
import { BaseFilterOptionRenders } from '../types/toolbarTypes';
import {
  FEATURE_STORE_EVENTS,
  FilterAppliedProperties,
  type FeatureStoreResourceType,
} from '../tracking/featureStoreTrackingConstants';

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
  trackingResourceType?: FeatureStoreResourceType;
};

export type FeatureStoreToolbarProps = BaseFeatureStoreToolbarProps & Partial<TagFilterProps>;

/** Placeholder for filters */
export function getSearchFilterPlaceholder(
  filterKey: string,
  filterOptions: Record<string, string>,
  explicitPlaceholder?: string,
): string {
  if (explicitPlaceholder) {
    return explicitPlaceholder;
  }
  const label = filterOptions[filterKey];
  if (filterKey === 'tags') {
    return `Filter by tag`;
  }
  if (!label) {
    return `Filter by ${filterKey}`;
  }
  const labelLower = label.toLowerCase();
  const excludedKeys = new Set([
    'owner',
    'type',
    'created',
    'updated',
    'tag',
    'storeType',
    'valueType',
    'joinKey',
  ]);
  if (excludedKeys.has(filterKey)) {
    return `Filter by ${labelLower}`;
  }
  // Labels that already end with " name" (e.g. "Entity name") must not append another " name".
  if (labelLower.endsWith(' name')) {
    return `Filter by ${labelLower}`;
  }
  return `Filter by ${labelLower} name`;
}

const TrackedSearchInput: React.FC<{
  filterKey: string;
  filterOptions: Record<string, string>;
  trackingResourceType?: FeatureStoreResourceType;
  onChange: (value?: string) => void;
  value?: string;
  placeholder?: string;
}> = ({ filterKey, filterOptions, trackingResourceType, onChange, value, placeholder }) => {
  const hasFiredRef = React.useRef(false);

  React.useEffect(() => {
    if (!value) {
      hasFiredRef.current = false;
    }
  }, [value]);

  return (
    <SearchInput
      value={value || ''}
      onChange={(_event, v) => {
        onChange(v);
        if (v && !hasFiredRef.current && trackingResourceType) {
          fireMiscTrackingEvent(FEATURE_STORE_EVENTS.FILTER_APPLIED, {
            filterAttribute: filterKey,
            resourceType: trackingResourceType,
          } satisfies FilterAppliedProperties);
          hasFiredRef.current = true;
        }
      }}
      placeholder={getSearchFilterPlaceholder(filterKey, filterOptions, placeholder)}
    />
  );
};

const TagMultiInput: React.FC<{
  tagFilters?: string[];
  onTagFilterAdd?: (tag: string) => void;
  onChange: (value?: string, label?: string) => void;
  value?: string;
  trackingResourceType?: FeatureStoreResourceType;
}> = ({ tagFilters = [], onTagFilterAdd, onChange, value, trackingResourceType }) => {
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
        if (trackingResourceType) {
          fireMiscTrackingEvent(FEATURE_STORE_EVENTS.FILTER_APPLIED, {
            filterAttribute: 'tag',
            resourceType: trackingResourceType,
          } satisfies FilterAppliedProperties);
        }
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
      placeholder="Filter by tag"
      aria-label="Search or add tag filter"
    />
  );
};

export function createDefaultFilterOptionRenders(
  filterOptions: Record<string, string>,
  tagFilters?: string[],
  onTagFilterAdd?: (tag: string) => void,
  trackingResourceType?: FeatureStoreResourceType,
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
          trackingResourceType={trackingResourceType}
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
              if (date) {
                if (trackingResourceType) {
                  fireMiscTrackingEvent(FEATURE_STORE_EVENTS.FILTER_APPLIED, {
                    filterAttribute: key,
                    resourceType: trackingResourceType,
                  } satisfies FilterAppliedProperties);
                }
              }
            }
          }}
        />
      );
    } else {
      result[key] = ({ onChange, value, placeholder }) => (
        <TrackedSearchInput
          filterKey={key}
          filterOptions={filterOptions}
          trackingResourceType={trackingResourceType}
          onChange={onChange}
          value={value}
          placeholder={placeholder}
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
  trackingResourceType,
  tagFilters = [],
  onTagFilterRemove,
  onTagFilterAdd,
}: FeatureStoreToolbarProps): JSX.Element {
  const filterOptionRenders = React.useMemo(
    () =>
      createDefaultFilterOptionRenders(
        filterOptions,
        tagFilters,
        onTagFilterAdd,
        trackingResourceType,
      ),
    [filterOptions, tagFilters, onTagFilterAdd, trackingResourceType],
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

  return (
    <FeatureStoreFilterToolbar<keyof typeof filterOptions>
      data-testid="feature-store-table-toolbar"
      filterOptions={filterOptions}
      filterOptionRenders={filterOptionRenders}
      filterData={filterData}
      onFilterUpdate={onFilterUpdate}
      currentFilterType={currentFilterType}
      onFilterTypeChange={onFilterTypeChange}
      multipleLabels={multipleLabels}
      trackingResourceType={trackingResourceType}
    >
      {children}
    </FeatureStoreFilterToolbar>
  );
}
