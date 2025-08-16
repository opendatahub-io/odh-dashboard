import * as React from 'react';
import { ToolbarGroup } from '@patternfly/react-core';

export type FeatureStoreFilterToolbarProps<T extends string> = React.ComponentProps<
  typeof ToolbarGroup
> & {
  children?: React.ReactNode;
  filterOptions: { [key in T]?: string };
  filterOptionRenders: Record<T, (props: FilterOptionRenders) => React.ReactNode>;
  filterData: FilterData<T>;
  onFilterUpdate: OnFilterUpdate<T>;
  testId?: string;
  currentFilterType?: T;
  onFilterTypeChange?: (filterType: T) => void;
  multipleLabels?: MultipleLabels<T>;
};

// Common types for toolbar functionality
export type FilterLabel = {
  key: string;
  node: string;
  props?: { 'data-testid': string };
};

export type FilterData<T extends string> = Record<
  T,
  string | { label: string; value: string } | undefined
>;

export type MultipleLabel = {
  key: string;
  label: string;
  onRemove: () => void;
  testId?: string;
};

export type MultipleLabels<T extends string> = Record<T, Array<MultipleLabel>>;

export type FilterOptionRenders = {
  onChange: (value?: string, label?: string) => void;
  value?: string;
  label?: string;
};

export type OnFilterUpdate<T extends string> = (
  filterType: T,
  value?: string | { label: string; value: string },
) => void;

export type LabelToDelete = string | { key: string };

export type MultipleLabelForType = Array<{ key: string; onRemove: () => void }>;
