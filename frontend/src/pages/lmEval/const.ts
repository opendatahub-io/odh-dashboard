import { SortableData } from '#~/components/table';
import { LMEvalKind } from '#~/k8sTypes';

export const columns: SortableData<LMEvalKind>[] = [
  {
    field: 'evaluation',
    label: 'Evaluation',
    sortable: (a, b) => a.metadata.name.localeCompare(b.metadata.name),
  },
  {
    field: 'model',
    label: 'Model',
    sortable: (a, b) => a.spec.model.localeCompare(b.spec.model),
  },
  {
    field: 'date',
    label: 'Date',
    sortable: (a: LMEvalKind, b: LMEvalKind): number => {
      const first = a.status?.completeTime;
      const second = b.status?.completeTime;
      return new Date(first ?? 0).getTime() - new Date(second ?? 0).getTime();
    },
  },
  {
    field: 'time',
    label: 'Time',
    sortable: (a: LMEvalKind, b: LMEvalKind): number => {
      const first = a.status?.completeTime;
      const second = b.status?.completeTime;
      return new Date(first ?? 0).getTime() - new Date(second ?? 0).getTime();
    },
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];
