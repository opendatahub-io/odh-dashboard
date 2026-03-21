import * as React from 'react';
import { SortableData } from 'mod-arch-shared';
import { AIModel } from '~/app/types';

const modelColumnPopover = (
  <div>
    <strong>Display name</strong> — friendly name shown across the UI. For endpoints you created,
    this is the name you provided.
    <br />
    <br />
    <strong>Model ID</strong> — exact identifier used in API calls. For endpoints you created, this
    must match the provider&apos;s model ID.
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
