import { SortableData } from '~/components/table/useTableColumnSort';
import { MockBiasConfigurationType } from './mockConfigurations';

// TODO: add sortable and bias configuration kind
export const columns: SortableData<MockBiasConfigurationType>[] = [
  {
    field: 'expand',
    label: '',
    sortable: false,
  },
  {
    field: 'name',
    label: 'Name',
    sortable: false,
  },
  {
    field: 'metric',
    label: 'Metric',
    sortable: false,
  },
  {
    field: 'protected-attribute',
    label: 'Protected attribute',
    sortable: false,
  },
  {
    field: 'privileged-value',
    label: 'Privileged value',
    sortable: false,
  },
  {
    field: 'unprivileged-value',
    label: 'Unprivileged value',
    sortable: false,
  },
  {
    field: 'output',
    label: 'Output',
    sortable: false,
  },
  {
    field: 'output-value',
    label: 'Output value',
    sortable: false,
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];
