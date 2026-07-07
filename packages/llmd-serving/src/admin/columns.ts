import { type SortableData, kebabTableColumn } from '@odh-dashboard/ui-core';
import type { LLMInferenceServiceConfigKind } from '../types';

export const columns: SortableData<LLMInferenceServiceConfigKind>[] = [
  {
    field: 'name',
    label: 'Name',
    sortable: false,
  },
  {
    field: 'enabled',
    label: 'Enabled',
    sortable: false,
    info: {
      popover:
        'When enabled, this LLM accelerator configuration is available to deployers in the model serving wizard.',
      popoverProps: {
        showClose: false,
      },
    },
  },
  kebabTableColumn(),
];
