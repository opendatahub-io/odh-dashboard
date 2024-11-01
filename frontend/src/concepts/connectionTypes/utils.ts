import { SecretKind } from '~/k8sTypes';
import { getDisplayNameFromK8sResource, translateDisplayNameForK8s } from '~/concepts/k8s/utils';
import { K8sNameDescriptionFieldData } from '~/concepts/k8s/K8sNameDescriptionField/types';
import {
  Connection,
  ConnectionTypeConfigMap,
  ConnectionTypeConfigMapObj,
  ConnectionTypeDataField,
  connectionTypeDataFields,
  ConnectionTypeDataFieldTypeUnion,
  ConnectionTypeField,
  ConnectionTypeFieldType,
  ConnectionTypeFieldTypeUnion,
  ConnectionTypeValueType,
} from '~/concepts/connectionTypes/types';
import { enumIterator } from '~/utilities/utils';

export const isConnectionTypeDataFieldType = (
  type: ConnectionTypeFieldTypeUnion | string,
): type is ConnectionTypeDataFieldTypeUnion =>
  connectionTypeDataFields.some((t) => t === type) && type !== ConnectionTypeFieldType.Section;

export const isConnectionTypeDataField = (
  field: ConnectionTypeField,
): field is ConnectionTypeDataField => field.type !== ConnectionTypeFieldType.Section;

export const isConnection = (secret: SecretKind): secret is Connection =>
  !!secret.metadata.annotations && 'opendatahub.io/connection-type' in secret.metadata.annotations;

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

export const ENV_VAR_NAME_REGEX = new RegExp('^[_a-zA-Z][_a-zA-Z0-9]*$');
export const isValidEnvVar = (name: string): boolean => ENV_VAR_NAME_REGEX.test(name);

export const isUriConnectionType = (connectionType: ConnectionTypeConfigMapObj): boolean =>
  !!connectionType.data?.fields?.find((f) => isConnectionTypeDataField(f) && f.envVar === 'URI');
export const isUriConnection = (connection?: Connection): boolean => !!connection?.data?.URI;

export const S3ConnectionTypeKeys = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_ENDPOINT',
  'AWS_S3_BUCKET',
];

export enum ModelServingCompatibleTypes {
  S3ObjectStorage = 'S3 compatible object storage',
  OCI = 'OCI compliant registry',
  URI = 'URI',
}

const modelServingCompatibleTypesMetadata: Record<
  ModelServingCompatibleTypes,
  {
    name: string;
    resource: string;
    envVars: string[];
    isConnectionCompatible?: (connection: Connection) => boolean;
  }
> = {
  [ModelServingCompatibleTypes.S3ObjectStorage]: {
    name: ModelServingCompatibleTypes.S3ObjectStorage,
    resource: 's3',
    envVars: S3ConnectionTypeKeys,
    isConnectionCompatible: (connection) =>
      connection.metadata.annotations['opendatahub.io/connection-type'] === 's3' &&
      connection.metadata.labels['opendatahub.io/managed'] === 'true',
  },
  [ModelServingCompatibleTypes.OCI]: {
    name: ModelServingCompatibleTypes.OCI,
    resource: 'oci-compliant-registry-v1',
    envVars: ['URI'],
  },
  [ModelServingCompatibleTypes.URI]: {
    name: ModelServingCompatibleTypes.URI,
    resource: 'uri-v1',
    envVars: ['URI'],
  },
};

export const isModelServingTypeCompatible = (
  envVars: string[],
  type: ModelServingCompatibleTypes,
): boolean =>
  modelServingCompatibleTypesMetadata[type].envVars.every((envVar) => envVars.includes(envVar));

const getModelServingCompatibleTypes = (envVars: string[]): ModelServingCompatibleTypes[] =>
  enumIterator(ModelServingCompatibleTypes).reduce<ModelServingCompatibleTypes[]>(
    (acc, [, value]) => {
      if (isModelServingTypeCompatible(envVars, value)) {
        acc.push(value);
      }
      return acc;
    },
    [],
  );

export const isModelServingCompatibleConnection = (connection: Connection): boolean =>
  getConnectionModelServingCompatibleTypes(connection).length > 0;

export const isModelServingCompatibleConnectionType = (
  connectionType: ConnectionTypeConfigMapObj,
): boolean => getConnectionTypeModelServingCompatibleTypes(connectionType).length > 0;

export const getConnectionModelServingCompatibleTypes = (
  connection: Connection,
): ModelServingCompatibleTypes[] =>
  getModelServingCompatibleTypes(
    Object.entries(connection.data ?? {})
      .filter(([, value]) => !!value)
      .map(([key]) => key),
  ).filter(
    (type) =>
      modelServingCompatibleTypesMetadata[type].isConnectionCompatible?.(connection) ?? true,
  );

export const getConnectionTypeModelServingCompatibleTypes = (
  connectionType: ConnectionTypeConfigMapObj,
): ModelServingCompatibleTypes[] =>
  getModelServingCompatibleTypes(
    connectionType.data?.fields?.filter(isConnectionTypeDataField).map((f) => f.envVar) ?? [],
  );

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

export const withRequiredFields = (
  connectionType?: ConnectionTypeConfigMapObj,
  envVars?: string[],
): ConnectionTypeConfigMapObj | undefined => {
  if (!connectionType) {
    return undefined;
  }
  const newFields = connectionType.data?.fields?.map((f) => ({
    ...f,
    ...(isConnectionTypeDataField(f) && envVars?.includes(f.envVar) && { required: true }),
  }));
  return {
    ...connectionType,
    data: connectionType.data
      ? {
          ...connectionType.data,
          fields: newFields,
        }
      : undefined,
  };
};

export const assembleConnectionSecret = (
  projectName: string,
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
      namespace: projectName,
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
  connectionTypes?: ConnectionTypeConfigMapObj[] | ConnectionTypeConfigMapObj,
): string => {
  const matchingType = Array.isArray(connectionTypes)
    ? connectionTypes.find(
        (type) =>
          type.metadata.name === connection.metadata.annotations['opendatahub.io/connection-type'],
      )
    : connectionTypes;
  return matchingType
    ? getDisplayNameFromK8sResource(matchingType)
    : connection.metadata.annotations['opendatahub.io/connection-type'];
};

export const filterEnabledConnectionTypes = <
  T extends ConnectionTypeConfigMap | ConnectionTypeConfigMapObj,
>(
  connectionTypes: T[],
): T[] =>
  connectionTypes.filter((t) => t.metadata.annotations?.['opendatahub.io/disabled'] !== 'true');

export const findSectionFields = (
  sectionIndex: number,
  fields: ConnectionTypeField[],
): ConnectionTypeField[] => {
  const nextSectionIndex = fields.findIndex(
    (f, i) => i > sectionIndex && f.type === ConnectionTypeFieldType.Section,
  );

  return fields.slice(sectionIndex + 1, nextSectionIndex === -1 ? undefined : nextSectionIndex);
};

export const filterModelServingConnectionTypes = (
  connectionTypes: ConnectionTypeConfigMapObj[],
): {
  key: ModelServingCompatibleTypes;
  name: string;
  type: ConnectionTypeConfigMapObj;
}[] =>
  enumIterator(ModelServingCompatibleTypes)
    .map(([, value]) => {
      const typeMetadata = modelServingCompatibleTypesMetadata[value];
      const connectionType = connectionTypes.find((t) => t.metadata.name === typeMetadata.resource);
      return connectionType
        ? { key: value, name: typeMetadata.name, type: connectionType }
        : undefined;
    })
    .filter((t) => t != null);
