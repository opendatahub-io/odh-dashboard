import { SortableData } from '#~/components/table/types.ts';
import { Features } from '#~/pages/featureStore/types/features';

export enum FeatureToolbarFilterOptions {
  feature = 'Feature',
  project = 'Project',
  tags = 'Tags',
  valueType = 'Value type',
  featureView = 'Feature view',
  owner = 'Owner',
}

export type FeatureFilterDataType = Record<FeatureToolbarFilterOptions, string | undefined>;

// Filter key mapping for features - maps filter keys to property paths
export const featureTableFilterKeyMapping: Record<string, string> = {
  [FeatureToolbarFilterOptions.feature]: 'name',
  [FeatureToolbarFilterOptions.project]: 'project',
  [FeatureToolbarFilterOptions.valueType]: 'type',
  [FeatureToolbarFilterOptions.featureView]: 'featureView',
  [FeatureToolbarFilterOptions.owner]: 'owner',
};

// Table column definitions
const baseColumns: SortableData<Features>[] = [
  {
    field: 'feature',
    label: 'Feature',
    width: 25,
    sortable: (a: Features, b: Features): number => a.name.localeCompare(b.name),
  },
  {
    field: 'valueType',
    label: 'Value Type',
    width: 25,
    sortable: (a: Features, b: Features): number => a.type?.localeCompare(b.type ?? '') ?? 0,
    info: {
      popover:
        'The data type of the feature values, such as STRING, INT64, or FLOAT. Value type helps determine how the feature is stored, validated, and used during model training or inference.',
    },
  },
  {
    field: 'featureView',
    label: 'Feature View',
    width: 25,
    sortable: (a: Features, b: Features): number => a.featureView.localeCompare(b.featureView),
    info: {
      popover:
        "The feature views that include this feature. Feature views group related features and define how they're retrieved from a data source.",
    },
  },
  {
    field: 'owner',
    label: 'Owner',
    width: 25,
    sortable: (a: Features, b: Features): number => a.owner?.localeCompare(b.owner ?? '') ?? 0,
  },
];

const projectColumn: SortableData<Features> = {
  field: 'project',
  label: 'Project',
  width: 25,
  sortable: (a: Features, b: Features): number => a.project?.localeCompare(b.project ?? '') ?? 0,
};

export const getColumns = (showAllProjects: boolean): SortableData<Features>[] => {
  if (showAllProjects) {
    return [baseColumns[0], projectColumn, ...baseColumns.slice(1)];
  }
  return baseColumns;
};

export const getFeatureFilterOptions = (
  showAllProjects: boolean,
): Partial<Record<FeatureToolbarFilterOptions, string>> => {
  const options = {
    [FeatureToolbarFilterOptions.feature]: 'Feature',
    [FeatureToolbarFilterOptions.valueType]: 'Value type',
    [FeatureToolbarFilterOptions.featureView]: 'Feature view',
    [FeatureToolbarFilterOptions.owner]: 'Owner',
  };

  if (showAllProjects) {
    return {
      ...options,
      [FeatureToolbarFilterOptions.project]: 'Project',
    };
  }

  return options;
};

export const getInitialFeatureFilterData = (showAllProjects: boolean): FeatureFilterDataType => ({
  [FeatureToolbarFilterOptions.feature]: '',
  [FeatureToolbarFilterOptions.project]: showAllProjects ? '' : undefined,
  [FeatureToolbarFilterOptions.tags]: '',
  [FeatureToolbarFilterOptions.valueType]: '',
  [FeatureToolbarFilterOptions.featureView]: '',
  [FeatureToolbarFilterOptions.owner]: '',
});

export enum FeatureDetailsTab {
  DETAILS = 'Details',
  FEATURE_VIEWS = 'Feature views',
}
