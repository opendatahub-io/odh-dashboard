import { SortableData } from '~/utilities/useTableColumnSort';
import { TemplateKind } from '~/k8sTypes';

export const columns: SortableData<TemplateKind>[] = [
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
