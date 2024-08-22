import {
  ConnectionTypeConfigMap,
  ConnectionTypeConfigMapObj,
  ConnectionTypeDataField,
  ConnectionTypeFieldType,
  ConnectionTypeFieldTypeUnion,
} from '~/concepts/connectionTypes/types';

export const toConnectionTypeConfigMapObj = (
  configMap: ConnectionTypeConfigMap,
): ConnectionTypeConfigMapObj => ({
  ...configMap,
  data: configMap.data
    ? {
        category: configMap.data.category ? JSON.parse(configMap.data.category) : undefined,
        fields: configMap.data.fields ? JSON.parse(configMap.data.fields) : undefined,
      }
    : undefined,
});

export const toConnectionTypeConfigMap = (
  obj: ConnectionTypeConfigMapObj,
): ConnectionTypeConfigMap => ({
  ...obj,
  data: obj.data
    ? {
        category: obj.data.category ? JSON.stringify(obj.data.category) : undefined,
        fields: obj.data.fields ? JSON.stringify(obj.data.fields) : undefined,
      }
    : undefined,
});

export const defaultValueToString = <T extends ConnectionTypeDataField>(
  field: T,
): string | undefined => {
  const { defaultValue } = field.properties;
  switch (field.type) {
    case ConnectionTypeFieldType.Dropdown:
      if (Array.isArray(defaultValue)) {
        const values =
          field.properties.variant === 'single' ? defaultValue.slice(0, 1) : defaultValue;
        const items = values
          .map((v) => {
            const item = field.properties.items?.find(({ value }) => value === v);
            if (item) {
              return `${item.label} (Value: ${item.value})`;
            }
            return null;
          })
          .filter((i) => i != null);
        return items.length > 0 ? items.join(', ') : undefined;
      }
      break;
    case ConnectionTypeFieldType.Numeric:
      if (defaultValue != null && field.properties.unit) {
        return `${defaultValue} ${field.properties.unit}`;
      }
      break;
  }
  return defaultValue == null ? defaultValue : `${defaultValue}`;
};

export const fieldTypeToString = (type: ConnectionTypeFieldTypeUnion): string => {
  switch (type) {
    case ConnectionTypeFieldType.URI:
      return 'URI';
    case ConnectionTypeFieldType.ShortText:
      return 'Text - Short';
    case ConnectionTypeFieldType.Text:
      return 'Text - Long';
    case ConnectionTypeFieldType.Hidden:
      return 'Text - Hidden';
    default:
      return (type.charAt(0).toUpperCase() + type.slice(1)).replace(/-/g, ' ');
  }
};

export const fieldNameToEnvVar = (name: string): string => {
  const spacesAsUnderscores = name.replace(/ /g, '_');
  const removeInvalid = spacesAsUnderscores.replace(/[^\w\-.]/g, '');
  const removeNumbersAtStart = removeInvalid.replace(/^[0-9]+/g, '');
  const allUppercase = removeNumbersAtStart.toUpperCase();
  return allUppercase;
};
