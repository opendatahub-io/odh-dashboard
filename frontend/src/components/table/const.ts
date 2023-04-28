import { SortableData } from '~/components/table/useTableColumnSort';

export const CHECKBOX_FIELD_ID = 'checkbox';

export const checkboxTableColumn = (): SortableData<unknown> => ({
  label: '',
  field: CHECKBOX_FIELD_ID,
  sortable: false,
});
