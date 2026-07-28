import { SortableData } from '@odh-dashboard/ui-core';
import { ProviderRef } from '~/app/types/external-models';

export const ExternalModelsExpandedRowColumns: SortableData<ProviderRef>[] = [
  {
    label: 'External provider',
    field: 'providerName',
    sortable: false,
  },
  {
    label: 'Provider URL',
    field: 'provider?.url',
    sortable: false,
  },
  {
    label: 'Path',
    field: 'path',
    sortable: false,
  },
  {
    label: 'Authentication',
    field: 'authentication',
    sortable: false,
  },
  {
    label: 'Credential secret',
    field: 'secretName',
    sortable: false,
  },
  {
    label: 'API format',
    field: 'apiFormat',
    sortable: false,
  },
  {
    label: 'Target model ID',
    field: 'targetModelId',
    sortable: false,
  },
  {
    label: 'Weight',
    field: 'weight',
    sortable: false,
  },
];
