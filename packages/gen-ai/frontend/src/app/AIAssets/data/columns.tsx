import * as React from 'react';
import { SortableData } from 'mod-arch-shared';
import { ODH_PRODUCT_NAME } from '@odh-dashboard/internal/utilities/const';
import { AIModel } from '~/app/types';

const modelColumnPopover = (
  <div>
    The model&apos;s {ODH_PRODUCT_NAME} display name, followed by the model ID, which is the exact
    identifier used in API calls.
  </div>
);

export const aiModelColumns: SortableData<AIModel>[] = [
  {
    field: 'model_name',
    label: 'Model',
    sortable: true,
    width: 20,
    info: {
      popover: modelColumnPopover,
      popoverProps: {
        headerContent: 'Model',
        minWidth: '400px',
        position: 'right',
      },
      ariaLabel: 'Model information',
    },
  },
  {
    field: 'usecase',
    label: 'Use case',
    sortable: false,
    width: 15,
  },
  {
    field: 'status',
    label: 'Status',
    sortable: false,
    width: 10,
  },
  {
    field: 'endpoints',
    label: 'Endpoints',
    sortable: false,
    width: 15,
  },
  {
    field: 'playground',
    label: 'Playground',
    sortable: false,
    width: 20,
  },
];
