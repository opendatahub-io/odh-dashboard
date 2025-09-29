import { checkboxTableColumn, SortableData } from 'mod-arch-shared';
import { AIModelStatusPopoverContent } from '~/app/AIAssets/components/AIModelsTable';
import { AIModel } from '~/app/types';

export const chatbotConfigurationColumns: SortableData<AIModel>[] = [
  checkboxTableColumn(),
  {
    label: 'Model deployment name',
    field: 'display_name',
    sortable: (a, b) => a.display_name.localeCompare(b.display_name),
    width: 50,
  },
  {
    label: 'Status',
    field: 'status',
    sortable: (a, b) => a.status.localeCompare(b.status),
    width: 20,
    info: {
      popover: AIModelStatusPopoverContent,
      popoverProps: {
        headerContent: 'To make a model deployment available:',
      },
    },
  },
  {
    label: 'Use case',
    field: 'use_case',
    sortable: (a, b) => a.usecase.localeCompare(b.usecase),
    width: 30,
  },
];
