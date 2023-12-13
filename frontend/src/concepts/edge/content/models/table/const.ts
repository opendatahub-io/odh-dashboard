import { SortableData } from '~/components/table';
import { EdgeModel, EdgeModelVersion } from '~/concepts/edge/types';

export const edgeModelsColumns: SortableData<EdgeModel>[] = [
  {
    field: 'expand',
    label: '',
    sortable: false,
  },
  {
    field: 'name',
    label: 'Name',
    sortable: false,
  },
  {
    field: 'lastRunStatus',
    label: 'Last run status',
    sortable: false,
  },
  {
    field: 'latestModelContainerImage',
    label: 'Latest model container image',
    sortable: false,
  },
  {
    field: 'versions',
    label: 'Image versions',
    sortable: false,
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];

export const edgeModelVersionsColumns: SortableData<EdgeModelVersion>[] = [
  {
    field: 'container-image',
    label: 'Model container image',
    sortable: false,
  },
  {
    field: 'image-size',
    label: 'Image size',
    sortable: false,
  },
  {
    field: 'created',
    label: 'Created',
    sortable: false,
  },
  {
    field: 'pipeline-run-name',
    label: 'Pipeline run name',
    sortable: false,
  },
  {
    field: 'container-image-url',
    label: 'Model container image URL',
    sortable: false,
  },
];
