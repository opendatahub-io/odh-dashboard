import * as React from 'react';
import { KnownLabels, SecretKind } from '#~/k8sTypes';
import { getDisplayNameFromK8sResource, translateDisplayNameForK8s } from '#~/concepts/k8s/utils';
import { K8sNameDescriptionFieldData } from '#~/concepts/k8s/K8sNameDescriptionField/types';
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
} from '#~/concepts/connectionTypes/types';
import { enumIterator } from '#~/utilities/utils';
import { AWSDataEntry, EnvVariableDataEntry } from '#~/pages/projects/types';
import { AwsKeys } from '#~/pages/projects/dataConnections/const';
import { isSecretKind } from '#~/pages/projects/screens/spawner/environmentVariables/utils';

export const isConnectionTypeDataFieldType = (
  type: ConnectionTypeFieldTypeUnion | string,
): type is ConnectionTypeDataFieldTypeUnion =>
  connectionTypeDataFields.some((t) => t === type) && type !== ConnectionTypeFieldType.Section;

export const isConnectionTypeDataField = (
  field: ConnectionTypeField,
): field is ConnectionTypeDataField => field.type !== ConnectionTypeFieldType.Section;

export const isConnectionType = (object: unknown): object is ConnectionTypeConfigMapObj =>
  typeof object === 'object' &&
  !!object &&
  'metadata' in object &&
  !!object.metadata &&
  typeof object.metadata === 'object' &&
  'labels' in object.metadata &&
  !!object.metadata.labels &&
  typeof object.metadata.labels === 'object' &&
  'opendatahub.io/connection-type' in object.metadata.labels &&
  object.metadata.labels['opendatahub.io/connection-type'] === 'true';

export const isConnection = (secret: SecretKind): secret is Connection =>
  !!secret.metadata.annotations &&
  ('opendatahub.io/connection-type' in secret.metadata.annotations ||
    'opendatahub.io/connection-type-ref' in secret.metadata.annotations) &&
  !!secret.metadata.labels &&
  KnownLabels.DASHBOARD_RESOURCE in secret.metadata.labels;

export const getConnectionTypeRef = (connection: Connection | undefined): string | undefined =>
  connection?.metadata.annotations['opendatahub.io/connection-type-ref'] ??
  connection?.metadata.annotations['opendatahub.io/connection-type'];

export const toConnectionTypeConfigMapObj = (
  configMap: ConnectionTypeConfigMap,
): ConnectionTypeConfigMapObj => {
  try {
    return {
      ...configMap,
      data: configMap.data
        ? {
            category: configMap.data.category ? JSON.parse(configMap.data.category) : undefined,
            fields: configMap.data.fields ? JSON.parse(configMap.data.fields) : undefined,
          }
        : undefined,
    };
  } catch (e) {
    throw new Error('Failed to parse connection type data.');
  }
};

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

export const ENV_VAR_NAME_REGEX = new RegExp('^[-_.a-zA-Z0-9]+$');
export const isValidEnvVar = (name: string): boolean => ENV_VAR_NAME_REGEX.test(name);

export enum ModelServingCompatibleTypes {
  S3ObjectStorage = 'S3 compatible object storage',
  URI = 'URI',
  OCI = 'OCI compliant registry',
}

export const URIConnectionTypeKeys = ['URI'];
export const OCIConnectionTypeKeys = ['.dockerconfigjson', 'OCI_HOST'];
export const OCIAccessTypeKey = ['ACCESS_TYPE'];
export const S3ConnectionTypeKeys = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_ENDPOINT',
  'AWS_S3_BUCKET',
];

const modelServingCompatibleTypesMetadata: Record<
  ModelServingCompatibleTypes,
  {
    name: string;
    resource: string;
    envVars: string[];
    managedType?: string;
  }
> = {
  [ModelServingCompatibleTypes.S3ObjectStorage]: {
    name: ModelServingCompatibleTypes.S3ObjectStorage,
    resource: 's3',
    envVars: S3ConnectionTypeKeys,
    managedType: 's3',
  },
  [ModelServingCompatibleTypes.URI]: {
    name: ModelServingCompatibleTypes.URI,
    resource: 'uri-v1',
    envVars: URIConnectionTypeKeys,
  },
  [ModelServingCompatibleTypes.OCI]: {
    name: ModelServingCompatibleTypes.OCI,
    resource: 'oci-v1',
    envVars: OCIConnectionTypeKeys,
  },
};

export const getModelServingConnectionTypeName = (type: ModelServingCompatibleTypes): string =>
  modelServingCompatibleTypesMetadata[type].resource;

export const isModelServingCompatible = (
  input: string[] | Connection | ConnectionTypeConfigMapObj,
  type?: ModelServingCompatibleTypes,
  connectionAccessType = 'Pull',
): boolean => {
  if (!type) {
    return getModelServingCompatibility(input).length > 0;
  }
  if (isSecretKind(input) && isConnection(input)) {
    if (type === ModelServingCompatibleTypes.OCI) {
      const accessType =
        input.stringData?.ACCESS_TYPE || window.atob(input.data?.ACCESS_TYPE ?? '');
      if (
        !(accessType.includes(connectionAccessType) || accessType === '[]' || accessType === '')
      ) {
        return false;
      }
    }

    const { managedType } = modelServingCompatibleTypesMetadata[type];
    if (
      managedType &&
      !(
        input.metadata.annotations['opendatahub.io/connection-type'] === managedType &&
        input.metadata.labels['opendatahub.io/managed'] === 'true'
      )
    ) {
      return false;
    }

    return modelServingCompatibleTypesMetadata[type].envVars.every((envVar) =>
      Object.keys(input.data || input.stringData || []).includes(envVar),
    );
  }
  if (isConnectionType(input)) {
    const fieldEnvs = input.data?.fields?.map((f) => isConnectionTypeDataField(f) && f.envVar);
    return modelServingCompatibleTypesMetadata[type].envVars.every((envVar) =>
      fieldEnvs?.includes(envVar),
    );
  }
  return modelServingCompatibleTypesMetadata[type].envVars.every((envVar) =>
    input.includes(envVar),
  );
};

export const getModelServingCompatibility = (
  input: string[] | Connection | ConnectionTypeConfigMapObj,
): ModelServingCompatibleTypes[] =>
  enumIterator(ModelServingCompatibleTypes).reduce<ModelServingCompatibleTypes[]>(
    (acc, [, value]) => {
      if (isModelServingCompatible(input, value)) {
        acc.push(value);
      }
      return acc;
    },
    [],
  );

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

export const getMRConnectionValues = (
  connectionValues: EnvVariableDataEntry[] | string,
): { [key: string]: ConnectionTypeValueType } => {
  const defaults: {
    [key: string]: ConnectionTypeValueType;
  } = {};
  if (typeof connectionValues !== 'string') {
    connectionValues.map((connectionValue) => {
      if (connectionValue.key !== 'Name') {
        defaults[connectionValue.key] = connectionValue.value;
      }
      return defaults;
    });
    return defaults;
  }
  if (!connectionValues.startsWith('oci:')) {
    defaults.URI = connectionValues;
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
    Object.entries(values)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return [key, JSON.stringify(value)]; // multi select
        }
        return [key, String(value)];
      })
      .filter(([, value]) => !!value),
  );

  const managedType = getModelServingCompatibility(Object.keys(connectionValuesAsStrings)).map(
    (t) => modelServingCompatibleTypesMetadata[t].managedType,
  )[0];

  const isPullSecret = !!values['.dockerconfigjson'];

  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: nameDesc.k8sName.value || translateDisplayNameForK8s(nameDesc.name),
      namespace: projectName,
      labels: {
        'opendatahub.io/dashboard': 'true',
        ...(managedType && { 'opendatahub.io/managed': 'true' }),
      },
      annotations: {
        'openshift.io/display-name': nameDesc.name,
        'openshift.io/description': nameDesc.description,
        'opendatahub.io/connection-type-ref': connectionTypeName,
        ...(managedType && { 'opendatahub.io/connection-type': managedType }),
      },
    },
    stringData: connectionValuesAsStrings,
    ...(isPullSecret && { type: 'kubernetes.io/dockerconfigjson' }),
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
): string | undefined => {
  const ref = getConnectionTypeRef(connection);
  const matchingType = Array.isArray(connectionTypes)
    ? connectionTypes.find((type) => type.metadata.name === ref)
    : connectionTypes;
  return matchingType ? getDisplayNameFromK8sResource(matchingType) : ref;
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

export const convertObjectStorageSecretData = (dataConnection: Connection): AWSDataEntry => {
  let convertedData: { key: AwsKeys; value: string }[] = [];
  const secretData = dataConnection.data;
  if (secretData) {
    convertedData = Object.values(AwsKeys)
      .filter((key) => key !== AwsKeys.NAME)
      .map((key: AwsKeys) => ({
        key,
        value: secretData[key] ? window.atob(secretData[key]) : '',
      }));
  }
  const convertedSecret: AWSDataEntry = [
    {
      key: AwsKeys.NAME,
      value: getDisplayNameFromK8sResource(dataConnection),
    },
    ...convertedData,
  ];
  return convertedSecret;
};

export const trimInputOnBlur =
  (value: string | undefined, onChange?: (value: string) => void) =>
  (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const trimmed = e.currentTarget.value.trim();
    if (trimmed !== value && onChange) {
      onChange(trimmed);
    }
  };

export const trimInputOnPaste =
  (value: string | undefined, onChange?: (value: string) => void) =>
  (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const trimmed = e.clipboardData.getData('text').trim();
    if (!onChange) {
      return;
    }
    e.preventDefault();
    onChange(trimmed);
  };
