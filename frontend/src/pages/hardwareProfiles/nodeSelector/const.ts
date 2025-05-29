import { SortableData } from '#~/components/table';
import { NodeSelector } from '#~/types';

export const nodeSelectorColumns: SortableData<NodeSelector>[] = [
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
    field: 'actions',
    label: '',
    sortable: false,
  },
];

export type NodeSelectorRow = { key: string; value: string };

export const EMPTY_NODE_SELECTOR: NodeSelectorRow = {
  key: '',
  value: '',
};
