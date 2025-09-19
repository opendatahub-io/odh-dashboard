import { SortableData } from '@odh-dashboard/internal/components/table/types';
import { Entity } from '../../types/entities';

export const columns: SortableData<Entity>[] = [
  {
    field: 'spec.name',
    label: 'Entity name',
    width: 60,
    sortable: (a, b): number => a.spec.name.localeCompare(b.spec.name),
  },
  {
    field: 'project',
    label: 'Feature store repositories',
    sortable: (a, b): number => (a.project || '').localeCompare(b.project || ''),
  },
  {
    field: 'spec.tags',
    label: 'Tags',
    width: 40,
    sortable: false,
  },
  {
    field: 'spec.joinKey',
    label: 'Join key',
    width: 15,
    sortable: (a, b): number => (a.spec.joinKey || '').localeCompare(b.spec.joinKey || ''),
    info: {
      popover:
        'A join key is the field used to match feature data to your training or inference dataset. Features that share a join key can be retrieved together during model training or online inference.',
      popoverProps: {
        position: 'left',
      },
    },
  },
  {
    field: 'spec.valueType',
    label: 'Value type',
    sortable: (a, b): number => (a.spec.valueType || '').localeCompare(b.spec.valueType || ''),
    info: {
      popover:
        'The data type of the join key (also called the entity ID). It must match the type used in your training and inference data.',
      popoverProps: {
        position: 'left',
      },
    },
  },
  {
    field: 'relationships',
    label: 'Feature views',
    sortable: false,
    info: {
      popover:
        'The total number of feature views that are configured to pull features from data sources within this entity. A feature view defines a group of related features and how to retrieve them from a source.',
      popoverProps: {
        position: 'left',
      },
    },
  },
  {
    field: 'meta.createdTimestamp',
    label: 'Created',
    sortable: (a, b): number =>
      (a.meta.createdTimestamp || '').localeCompare(b.meta.createdTimestamp || ''),
  },
  {
    field: 'meta.lastUpdatedTimestamp',
    label: 'Last modified',
    sortable: (a, b): number =>
      (a.meta.lastUpdatedTimestamp || '').localeCompare(b.meta.lastUpdatedTimestamp || ''),
  },
  {
    field: 'spec.owner',
    label: 'Owner',
    sortable: (a, b): number => (a.spec.owner || '').localeCompare(b.spec.owner || ''),
  },
];

export const entityTableFilterOptions: Record<string, string> = {
  entity: 'Entity name',
  project: 'Feature store repositories',
  tag: 'Tags',
  joinKey: 'Join key',
  valueType: 'Value type',
  featureViews: 'Feature views',
  created: 'Created after',
  updated: 'Updated after',
  owner: 'Owner',
};

export enum EntityDetailsTab {
  DETAILS = 'Details',
  FEATURE_VIEWS = 'Feature views',
}
