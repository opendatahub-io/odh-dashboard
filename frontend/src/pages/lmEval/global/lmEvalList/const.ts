import { SortableData } from '#~/components/table';
import { LMEvalKind } from '#~/k8sTypes';

export const columns: SortableData<LMEvalKind>[] = [
  {
    field: 'evaluation',
    label: 'Evaluation',
    sortable: (a: LMEvalKind, b: LMEvalKind): number =>
      a.metadata.name.localeCompare(b.metadata.name),
  },
  {
    field: 'model',
    label: 'Model',
    sortable: (a: LMEvalKind, b: LMEvalKind): number => {
      const aModel = a.spec.modelArgs?.find((arg) => arg.name === 'model')?.value;
      const bModel = b.spec.modelArgs?.find((arg) => arg.name === 'model')?.value;
      return aModel?.localeCompare(bModel ?? '') ?? 0;
    },
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

export enum LMEvalToolbarFilterOptions {
  name = 'Name',
  model = 'Model',
}

export const LMEvalFilterOptions = {
  [LMEvalToolbarFilterOptions.name]: 'Name',
  [LMEvalToolbarFilterOptions.model]: 'Model',
};

export type LMEvalFilterDataType = Record<LMEvalToolbarFilterOptions, string | undefined>;

export const initialLMEvalFilterData: LMEvalFilterDataType = {
  [LMEvalToolbarFilterOptions.name]: '',
  [LMEvalToolbarFilterOptions.model]: '',
};
