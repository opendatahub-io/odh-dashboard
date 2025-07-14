import { SortableData } from '#~/components/table';
import { Artifact as MlmdArtifact } from '#~/third_party/mlmd';

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

export const columns: SortableData<MlmdArtifact>[] = [
  {
    label: 'Artifact',
    field: 'name',
    sortable: false,
    width: 20,
  },
  {
    label: 'ID',
    field: 'id',
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
    field: 'createTimeSinceEpoch',
    sortable: false,
    width: 15,
  },
];

export enum ArtifactDetailsTabKey {
  Overview = 'overview',
  LineageExplorer = 'lineage-explorer',
}
