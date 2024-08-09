import {
  ConnectionTypeConfigMap,
  ConnectionTypeConfigMapObj,
  ConnectionTypeDataField,
  ConnectionTypeFieldType,
} from '~/concepts/connectionTypes/types';

export const toConnectionTypeConfigMapObj = (
  configMap: ConnectionTypeConfigMap,
): ConnectionTypeConfigMapObj => ({
  ...configMap,
  data: configMap.data
    ? { fields: configMap.data.fields ? JSON.parse(configMap.data.fields) : undefined }
    : undefined,
});

export const toConnectionTypeConfigMap = (
  obj: ConnectionTypeConfigMapObj,
): ConnectionTypeConfigMap => ({
  ...obj,
  data: obj.data
    ? { fields: obj.data.fields ? JSON.stringify(obj.data.fields) : undefined }
    : undefined,
});

export const defaultValueToString = <T extends ConnectionTypeDataField>(
  field: T,
): string | undefined => {
  const { defaultValue } = field.properties;
  switch (field.type) {
    case ConnectionTypeFieldType.Hidden:
      if (defaultValue) {
        return '••••••••••';
      }
      break;
    case ConnectionTypeFieldType.Dropdown:
      if (Array.isArray(defaultValue)) {
        const values =
          field.properties.variant === 'single' ? defaultValue.slice(0, 1) : defaultValue;
        const items = values
          .map((v) => field.properties.items?.find(({ value }) => value === v)?.label)
          .filter((i) => i != null);
        return items.length > 0 ? items.join(', ') : undefined;
      }
      break;
  }
  return defaultValue == null ? defaultValue : `${defaultValue}`;
};

export const fieldTypeToString = <T extends ConnectionTypeDataField>(field: T): string => {
  if (field.type === ConnectionTypeFieldType.URI) {
    return field.type.toUpperCase();
  }

  const withSpaces = field.type.replace(/-/g, ' ');
  const withCapitalized = withSpaces[0].toUpperCase() + withSpaces.slice(1);

  return withCapitalized;
};
