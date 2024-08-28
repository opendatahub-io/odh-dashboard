import {
  ConnectionTypeDataField,
  ConnectionTypeFieldType,
  FileField,
} from '~/concepts/connectionTypes/types';

const cleanupFileUploadField = (field: FileField): FileField => ({
  ...field,
  properties: {
    ...field.properties,
    extensions: field.properties.extensions?.filter((ext) => !!ext).map((ext) => ext.toLowerCase()),
  },
});

export const prepareFieldForSave = (field: ConnectionTypeDataField): ConnectionTypeDataField => {
  switch (field.type) {
    case ConnectionTypeFieldType.File:
      return cleanupFileUploadField(field);
  }
  return field;
};
