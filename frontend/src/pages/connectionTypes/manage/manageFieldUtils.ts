import {
  ConnectionTypeDataField,
  ConnectionTypeFieldType,
  DropdownField,
  FileField,
} from '#~/concepts/connectionTypes/types';

const cleanupFileUploadField = (field: FileField): FileField => ({
  ...field,
  properties: {
    ...field.properties,
    extensions: field.properties.extensions?.filter((ext) => !!ext).map((ext) => ext.toLowerCase()),
  },
});

const cleanupDropdownField = (field: DropdownField): DropdownField => ({
  ...field,
  properties: {
    ...field.properties,
    items: field.properties.items?.filter((item) => item.value),
  },
});

export const prepareFieldForSave = (field: ConnectionTypeDataField): ConnectionTypeDataField => {
  switch (field.type) {
    case ConnectionTypeFieldType.File:
      return cleanupFileUploadField(field);
    case ConnectionTypeFieldType.Dropdown:
      return cleanupDropdownField(field);
  }
  return field;
};
