export type FieldMode = 'preview' | 'default' | 'instance';

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
