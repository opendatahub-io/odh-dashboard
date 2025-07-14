import { SortableData } from '#~/components/table';
import { LMEvalKind } from '#~/k8sTypes';
import { getLMEvalState } from './utils';

export const columns: SortableData<LMEvalKind>[] = [
  {
    field: 'name',
    label: 'Name',
    width: 25,
    sortable: (a: LMEvalKind, b: LMEvalKind): number =>
      a.metadata.name.localeCompare(b.metadata.name),
  },
  {
    field: 'model',
    label: 'Model',
    width: 25,
    sortable: (a: LMEvalKind, b: LMEvalKind): number => {
      const aModel = a.spec.modelArgs?.find((arg) => arg.name === 'model')?.value;
      const bModel = b.spec.modelArgs?.find((arg) => arg.name === 'model')?.value;
      return aModel?.localeCompare(bModel ?? '') ?? 0;
    },
  },
  {
    field: 'started',
    label: 'Started',
    width: 25,
    sortable: (a: LMEvalKind, b: LMEvalKind): number => {
      const first = a.metadata.creationTimestamp;
      const second = b.metadata.creationTimestamp;
      return new Date(first ?? 0).getTime() - new Date(second ?? 0).getTime();
    },
  },
  {
    field: 'status',
    label: 'Status',
    width: 25,
    sortable: (a: LMEvalKind, b: LMEvalKind): number => {
      const aState = getLMEvalState(a.status);
      const bState = getLMEvalState(b.status);
      return aState.localeCompare(bState);
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
