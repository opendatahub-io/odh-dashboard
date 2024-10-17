import { ProjectKind } from '~/k8sTypes';
import { translateDisplayNameForK8s } from '~/concepts/k8s/utils';
import { K8sNameDescriptionFieldData } from '~/concepts/k8s/K8sNameDescriptionField/types';
import {
  Connection,
  ConnectionTypeConfigMap,
  ConnectionTypeConfigMapObj,
  ConnectionTypeDataField,
  ConnectionTypeFieldType,
  ConnectionTypeFieldTypeUnion,
  ConnectionTypeValueType,
  isConnectionTypeDataField,
} from '~/concepts/connectionTypes/types';
import { enumIterator } from '~/utilities/utils';

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
  const spacesAsUnderscores = name.replace(/(\s|-)/g, '_');
  const removeInvalid = spacesAsUnderscores.replace(/[^\w]/g, '');
  const removeNumbersAtStart = removeInvalid.replace(/^[0-9]+/g, '');
  const allUppercase = removeNumbersAtStart.toUpperCase();
  return allUppercase;
};

const ENV_VAR_NAME_REGEX = new RegExp('^[_a-zA-Z][_a-zA-Z0-9]*$');
export const isValidEnvVar = (name: string): boolean => ENV_VAR_NAME_REGEX.test(name);

export const isModelServingCompatible = (envVars: string[]): boolean =>
  ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_ENDPOINT', 'AWS_S3_BUCKET'].every(
    (envVar) => envVars.includes(envVar),
  );

export enum CompatibleTypes {
  ModelServing = 'Model serving',
}

const compatibilities: Record<CompatibleTypes, (envVars: string[]) => boolean> = {
  [CompatibleTypes.ModelServing]: isModelServingCompatible,
};

export const getCompatibleTypes = (envVars: string[]): CompatibleTypes[] =>
  enumIterator(CompatibleTypes).reduce<CompatibleTypes[]>((acc, [, value]) => {
    if (compatibilities[value](envVars)) {
      acc.push(value);
    }
    return acc;
  }, []);

export const getDefaultValues = (
  connectionType: ConnectionTypeConfigMapObj,
): { [key: string]: ConnectionTypeValueType } => {
  const defaults: {
    [key: string]: ConnectionTypeValueType;
  } = {};
  for (const field of connectionType.data?.fields ?? []) {
    if (isConnectionTypeDataField(field) && field.properties.defaultValue != null) {
      defaults[field.envVar] = field.properties.defaultValue;
    }
  }
  return defaults;
};

export const assembleConnectionSecret = (
  project: ProjectKind,
  connectionTypeName: string,
  nameDesc: K8sNameDescriptionFieldData,
  values: {
    [key: string]: ConnectionTypeValueType;
  },
): Connection => {
  const connectionValuesAsStrings = Object.fromEntries(
    Object.entries(values).map(([key, value]) => {
      if (Array.isArray(value)) {
        return [key, JSON.stringify(value)]; // multi select
      }
      return [key, String(value)];
    }),
  );
  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: nameDesc.k8sName.value || translateDisplayNameForK8s(nameDesc.name),
      namespace: project.metadata.name,
      labels: {
        'opendatahub.io/dashboard': 'true',
        'opendatahub.io/managed': 'true',
      },
      annotations: {
        'opendatahub.io/connection-type': connectionTypeName,
        'openshift.io/display-name': nameDesc.name,
        'openshift.io/description': nameDesc.description,
      },
    },
    stringData: connectionValuesAsStrings,
  };
};

export const parseConnectionSecretValues = (
  connection: Connection,
  connectionType?: ConnectionTypeConfigMapObj,
): { [key: string]: ConnectionTypeValueType } => {
  const response: { [key: string]: ConnectionTypeValueType } = {};

  for (const [key, value] of Object.entries(connection.data ?? {})) {
    const decodedString = window.atob(value);
    const matchingField = connectionType?.data?.fields?.find(
      (f) => isConnectionTypeDataField(f) && f.envVar === key,
    );

    if (matchingField?.type === ConnectionTypeFieldType.Boolean) {
      response[key] = decodedString === 'true';
    } else if (matchingField?.type === ConnectionTypeFieldType.Numeric) {
      response[key] = Number(decodedString);
    } else if (
      matchingField?.type === ConnectionTypeFieldType.Dropdown &&
      matchingField.properties.variant === 'multi'
    ) {
      try {
        const parsed = JSON.parse(decodedString);
        if (Array.isArray(parsed)) {
          response[key] = parsed.map((v) => String(v));
        } else {
          response[key] = [decodedString];
        }
      } catch {
        response[key] = [decodedString];
      }
    } else {
      response[key] = decodedString;
    }
  }

  return response;
};

export const getConnectionTypeDisplayName = (
  connection: Connection,
  connectionTypes: ConnectionTypeConfigMapObj[],
): string => {
  const matchingType = connectionTypes.find(
    (type) =>
      type.metadata.name === connection.metadata.annotations['opendatahub.io/connection-type'],
  );
  return (
    matchingType?.metadata.annotations?.['openshift.io/display-name'] ||
    connection.metadata.annotations['opendatahub.io/connection-type']
  );
};

export const filterEnabledConnectionTypes = <
  T extends ConnectionTypeConfigMap | ConnectionTypeConfigMapObj,
>(
  connectionTypes: T[],
): T[] =>
  connectionTypes.filter((t) => t.metadata.annotations?.['opendatahub.io/enabled'] === 'true');
