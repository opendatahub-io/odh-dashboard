import { SortableData } from '#~/components/table';
import { Execution } from '#~/third_party/mlmd';

export const executionColumns: SortableData<Execution>[] = [
  {
    label: 'Executions',
    field: 'name',
    sortable: false,
  },
  {
    label: 'Status',
    field: 'status',
    sortable: false,
    width: 15,
  },
  {
    label: 'ID',
    field: 'execution_id',
    sortable: false,
    width: 15,
  },
  {
    label: 'Type',
    field: 'type',
    sortable: false,
    width: 40,
  },
];
