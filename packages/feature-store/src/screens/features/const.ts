import { SortableData } from '@odh-dashboard/internal/components/table/types';
import { Features } from '../../types/features';

export const featureTableFilterOptions: Record<string, string> = {
  feature: 'Feature',
  project: 'Project',
  valueType: 'Value type',
  featureView: 'Feature view',
  owner: 'Owner',
};

// Table column definitions
export const baseColumns: SortableData<Features>[] = [
  {
    field: 'feature',
    label: 'Feature',
    width: 25,
    sortable: (a: Features, b: Features): number => a.name.localeCompare(b.name),
  },
  {
    field: 'project',
    label: 'Project',
    sortable: (a: Features, b: Features): number => a.project?.localeCompare(b.project ?? '') ?? 0,
  },
  {
    field: 'valueType',
    label: 'Value type',
    width: 25,
    sortable: (a: Features, b: Features): number => a.type?.localeCompare(b.type ?? '') ?? 0,
    info: {
      popover:
        'The data type of the feature values, such as STRING, INT64, or FLOAT. Value type helps determine how the feature is stored, validated, and used during model training or inference.',
    },
  },
  {
    field: 'featureView',
    label: 'Feature view',
    width: 25,
    sortable: (a: Features, b: Features): number => a.featureView.localeCompare(b.featureView),
    info: {
      popover:
        'The feature views that include this feature. A feature view defines a group of related features and how to retrieve them from a data source over time.',
    },
  },
  {
    field: 'owner',
    label: 'Owner',
    width: 25,
    sortable: (a: Features, b: Features): number => a.owner?.localeCompare(b.owner ?? '') ?? 0,
  },
];

export enum FeatureDetailsTab {
  DETAILS = 'Details',
  FEATURE_VIEWS = 'Feature views',
}
