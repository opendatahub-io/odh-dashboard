import {
  ConnectionTypeDataField,
  ConnectionTypeFieldType,
  DropdownField,
  FileField,
} from '#~/concepts/connectionTypes/types';

/**
 * Remove spaces and empty values from file extensions
 */
const cleanupFileUploadField = (field: FileField): FileField => ({
  ...field,
  properties: {
    ...field.properties,
    extensions: field.properties.extensions
      ?.map((ext) => ext.toLowerCase().replace(/ /g, ''))
      .filter((ext) => !!ext),
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
  let newField = field;
  // If the field is deferred, remove default value to avoid data leakage of sensitive information
  if (field.properties.deferInput) {
    newField = {
      ...newField,
      properties: {
        ...field.properties,
        defaultValue: undefined,
        defaultReadOnly: undefined,
      },
    };
  }

  switch (newField.type) {
    case ConnectionTypeFieldType.File:
      return cleanupFileUploadField(newField);
    case ConnectionTypeFieldType.Dropdown:
      return cleanupDropdownField(newField);
  }
  return newField;
};
