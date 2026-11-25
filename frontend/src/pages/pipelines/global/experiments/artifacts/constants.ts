import { SortableData } from '@odh-dashboard/ui-core';
import { ArtifactKF } from '#~/concepts/pipelines/kfTypes';

export enum FilterOptions {
  Artifact = 'name',
  Id = 'id',
  Type = 'type',
}
export const initialFilterData: Record<FilterOptions, string | undefined> = {
  [FilterOptions.Artifact]: '',
  [FilterOptions.Id]: '',
  [FilterOptions.Type]: undefined,
};

export const options = {
  [FilterOptions.Artifact]: 'Artifact',
  [FilterOptions.Id]: 'ID',
  [FilterOptions.Type]: 'Type',
};

export const columns: SortableData<ArtifactKF>[] = [
  {
    label: 'Artifact',
    field: 'name',
    sortable: false,
    width: 20,
  },
  {
    label: 'ID',
    field: 'artifact_id',
    sortable: false,
    width: 10,
  },
  {
    label: 'Type',
    field: 'type',
    sortable: false,
    width: 15,
  },
  {
    label: 'URI',
    field: 'uri',
    sortable: false,
  },
  {
    label: 'Created',
    field: 'created_at',
    sortable: false,
    width: 15,
  },
];

export enum ArtifactDetailsTabKey {
  Overview = 'overview',
  LineageExplorer = 'lineage-explorer',
}

export const artifactsPageTitle = 'Artifacts';
export const artifactsPageDescription = 'View your artifacts and their metadata.';
