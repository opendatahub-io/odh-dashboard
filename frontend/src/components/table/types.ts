import { ThProps } from '@patternfly/react-table';

export type GetColumnSort = (columnIndex: number) => ThProps['sort'];

export type SortableData<T> = {
  label: string;
  field: string;
  colSpan?: number;
  rowSpan?: number;
  hasRightBorder?: boolean;
  width?: ThProps['width'];
  /**
   * Set to false to disable sort.
   * Set to true to handle string and number fields automatically (everything else is equal).
   * Pass a function that will get the two results and what field needs to be matched.
   * Assume ASC -- the result will be inverted internally if needed.
   */
  sortable: boolean | ((a: T, b: T, keyField: string) => number);
  info?: ThProps['info'];
};
