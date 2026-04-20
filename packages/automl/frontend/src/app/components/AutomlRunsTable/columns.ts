import type { SortableData } from '@odh-dashboard/internal/components/table';
import type { PipelineRun } from '~/app/types';

/**
 * BFF paginates pipeline runs; client-side sortable would only sort the current page,
 * which is misleading. Sorting is disabled until the BFF supports sort parameters.
 */
export const automlRunsColumns: SortableData<PipelineRun>[] = [
  { label: 'Name', field: 'display_name', sortable: false, width: 20 },
  { label: 'Description', field: 'description', sortable: false, width: 25 },
  { label: 'Prediction type', field: 'task_type', sortable: false, width: 15 },
  { label: 'Started', field: 'created_at', sortable: false, width: 15 },
  { label: 'Status', field: 'state', sortable: false, width: 10 },
  { label: '', field: 'actions', sortable: false, screenReaderText: 'Actions' },
];
