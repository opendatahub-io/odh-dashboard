import { checkboxTableColumn, SortableData } from 'mod-arch-shared';
import { AIModelStatusPopoverContent } from '~/app/AIAssets/components/AIModelsTable';
import { AIModel } from '~/app/types';
import {
  EmbeddingDimensionPopoverContent,
  MaxTokensPopoverContent,
} from './ChatbotConfigurationTableRow';

export const chatbotConfigurationColumns: SortableData<AIModel>[] = [
  checkboxTableColumn(),
  {
    label: 'Model name',
    field: 'display_name',
    sortable: (a, b) => a.display_name.localeCompare(b.display_name),
    width: 50,
    info: {
      popover: 'The display name of the model endpoint.',
    },
  },
  {
    label: 'Status',
    field: 'status',
    sortable: (a, b) => a.status.localeCompare(b.status),
    width: 20,
    info: {
      popover: AIModelStatusPopoverContent,
    },
  },
  {
    label: 'Use case',
    field: 'use_case',
    sortable: (a, b) => a.usecase.localeCompare(b.usecase),
    width: 30,
  },
  {
    label: 'Type',
    field: 'model_type',
    sortable: false,
    width: 20,
  },
  {
    label: 'Max tokens',
    field: 'max_tokens',
    width: 20,
    sortable: false,
    info: {
      popover: MaxTokensPopoverContent,
    },
  },
  {
    label: 'Embedding dimension',
    field: 'embedding_dimension',
    width: 20,
    sortable: false,
    info: {
      popover: EmbeddingDimensionPopoverContent,
    },
  },
];
