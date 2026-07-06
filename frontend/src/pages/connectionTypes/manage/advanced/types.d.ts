export type AdvancedFieldProps<T extends ConnectionTypeDataField> = {
  field: T;
  onChange: (value: T['properties']) => void;
  onValidate: (isValid: boolean) => void;
  properties: T['properties'];
};
