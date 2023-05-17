import { SortableData } from '~/components/table/useTableColumnSort';
import { TemplateKind } from '~/k8sTypes';

export const columns: SortableData<TemplateKind>[] = [
  {
    field: 'draggable',
    label: '',
    sortable: false,
  },
  {
    field: 'name',
    label: 'Name',
    sortable: false,
  },
  {
    field: 'enabled',
    label: 'Enabled',
    sortable: false,
    info: {
      popover: 'Select which runtimes are available to users when serving models.',
      popoverProps: {
        showClose: false,
      },
    },
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];
