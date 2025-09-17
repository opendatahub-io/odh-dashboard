export interface AIModelTableColumn {
  field: string;
  label: string;
  sortable: boolean;
  width?: number;
  info?: {
    popover: string;
    popoverProps?: {
      showClose?: boolean;
    };
  };
}
