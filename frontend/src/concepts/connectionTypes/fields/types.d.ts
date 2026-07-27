// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- re-exporting from k8s-core for backward compatibility
export type { FieldMode } from '@odh-dashboard/k8s-core';
import type { ConnectionTypeDataField, FieldMode } from '@odh-dashboard/k8s-core';

export type FieldProps<T extends ConnectionTypeDataField> = {
  id: string;
  field: T;
  'data-testid'?: string;
  mode?: FieldMode;
  onChange?: (value: T['properties']['defaultValue']) => void;
  value?: T['properties']['defaultValue'];
  onValidate?: (error: boolean | string, value: T['properties']['defaultValue']) => void;
  error?: string | boolean;
  isDisabled?: boolean;
};
