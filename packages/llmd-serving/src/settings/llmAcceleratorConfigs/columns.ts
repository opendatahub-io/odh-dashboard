import { type SortableData, kebabTableColumn } from '@odh-dashboard/ui-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import type { LLMInferenceServiceConfigKind } from '../../types';

export const columns: SortableData<LLMInferenceServiceConfigKind>[] = [
  {
    field: 'name',
    label: 'Name',
    sortable: (a, b) =>
      getDisplayNameFromK8sResource(a).localeCompare(getDisplayNameFromK8sResource(b)),
  },
  {
    field: 'enabled',
    label: 'Enabled',
    sortable: false,
    info: {
      popover: 'When enabled, this configuration is available in the deployment wizard.',
      popoverProps: {
        showClose: true,
      },
    },
  },
  kebabTableColumn(),
];
