import { SimpleSelectOption } from '#~/components/SimpleSelect';
import { SortableData } from '#~/components/table';
import { Toleration, TolerationEffect, TolerationOperator } from '#~/types';

export const tolerationColumns: SortableData<Toleration>[] = [
  {
    field: 'operator',
    label: 'Operator',
    sortable: false,
  },
  {
    field: 'key',
    label: 'Key',
    sortable: false,
  },
  {
    field: 'value',
    label: 'Value',
    sortable: false,
  },
  {
    field: 'effect',
    label: 'Effect',
    sortable: false,
  },
  {
    field: 'toleration_seconds',
    label: 'Toleration seconds',
    sortable: false,
  },
  {
    field: 'actions',
    label: '',
    sortable: false,
  },
];

export const EMPTY_TOLERATION: Toleration = {
  key: '',
  operator: TolerationOperator.EQUAL,
};

export const operatorDropdownOptions: SimpleSelectOption[] = [
  {
    key: TolerationOperator.EQUAL,
    label: TolerationOperator.EQUAL,
    description:
      'A toleration "matches" a taint if the keys are the same, the effects are the same, and the values are equal.',
  },
  {
    key: TolerationOperator.EXISTS,
    label: TolerationOperator.EXISTS,
    description:
      'A toleration "matches" a taint if the keys are the same and the effects are the same. No value should be specified.',
  },
];

export const effectDropdownOptions: SimpleSelectOption[] = [
  {
    key: '',
    label: 'None',
    isPlaceholder: true,
  },
  {
    key: TolerationEffect.NO_SCHEDULE,
    label: TolerationEffect.NO_SCHEDULE,
    description: 'Prevents scheduling of new pods on the node with the matching taint.',
  },
  {
    key: TolerationEffect.PREFER_NO_SCHEDULE,
    label: TolerationEffect.PREFER_NO_SCHEDULE,
    description: 'Scheduler will try to avoid placing a pod on the node but it is not guaranteed.',
  },
  {
    key: TolerationEffect.NO_EXECUTE,
    label: TolerationEffect.NO_EXECUTE,
    description: 'Pods will be evicted from the node if they do not tolerate the taint.',
  },
];
