import {
  Deployment,
  ModelResourceType,
  ServerResourceType,
} from '@odh-dashboard/model-serving/extension-points';
import { isPVCUri } from '@odh-dashboard/internal/pages/modelServing/screens/projects/utils';
import { KnownLabels, MetadataAnnotation } from '@odh-dashboard/internal/k8sTypes';
import { ConnectionTypeConfigMapObj } from '@odh-dashboard/internal/concepts/connectionTypes/types';
import { ModelServingCompatibleTypes } from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import { getSecret } from '@odh-dashboard/internal/api/k8s/secrets';
import {
  ModelLocationData,
  ModelLocationType,
  ConnectionTypeRefs,
} from '../../model-serving/src/components/deploymentWizard/fields/modelLocationFields/types';

interface SecretData {
  hasOwnerRef: boolean;
  connectionTypeRef: string;
  data: Record<string, string>;
}

const getSecretData = async (
  secretName: string,
  namespace: string,
): Promise<SecretData | undefined> => {
  try {
    const secret = await getSecret(namespace, secretName);
    return {
      hasOwnerRef: !!secret.metadata.ownerReferences?.length,
      connectionTypeRef:
        secret.metadata.annotations?.['opendatahub.io/connection-type-ref'] ||
        secret.metadata.annotations?.['opendatahub.io/connection-type'] ||
        '',
      data: Object.entries(secret.data || {}).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: (() => {
            const decoded = window.atob(value);
            // Only parse if it looks like a JSON array (ex. OCI access types)
            if (decoded.startsWith('[') && decoded.endsWith(']')) {
              try {
                return JSON.parse(decoded);
              } catch {
                return decoded;
              }
            }
            return decoded;
          })(),
        }),
        {},
      ),
    };
  } catch (e) {
    console.error('Failed to fetch secret:', e);
    return undefined;
  }
};

export const getModelLocationUri = (deployment: KServeDeployment): string | undefined => {
  const {
    model: {
      spec: { predictor },
    },
  } = deployment;
  return predictor.model?.storageUri;
};
const getConnectionTypeObject = (
  connectionTypeRef: string,
  connectionTypes: ConnectionTypeConfigMapObj[],
): ConnectionTypeConfigMapObj => {
  // Try to find the full connection type object first
  const foundType = connectionTypes.find((ct) => ct.metadata.name === connectionTypeRef);
  if (foundType) {
    return foundType;
  }

  // Fall back to basic object for custom types
  return {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: connectionTypeRef,
      labels: {
        [KnownLabels.DASHBOARD_RESOURCE]: 'true',
        'opendatahub.io/connection-type': 'true',
      },
      annotations: {
        'opendatahub.io/connection-type': connectionTypeRef,
      },
    },
    data: {
      fields: [],
    },
  };
};

const hasConnectionAnnotation = (deployment: KServeDeployment): string | undefined => {
  const {
    model: {
      metadata: { annotations },
    },
  } = deployment;
  return annotations?.[MetadataAnnotation.ConnectionName];
};

const extractAdditionalFields = (deployment: KServeDeployment): Record<string, string> => {
  const additionalFields: Record<string, string> = {};
  const {
    model: {
      spec: { predictor },
    },
  } = deployment;
  const connectionType = predictor.model?.storage?.key
    ? ModelServingCompatibleTypes.S3ObjectStorage
    : predictor.imagePullSecrets?.length
    ? ModelServingCompatibleTypes.OCI
    : predictor.model?.storageUri && !isPVCUri(predictor.model.storageUri)
    ? ModelServingCompatibleTypes.URI
    : undefined;

  if (connectionType === ModelServingCompatibleTypes.S3ObjectStorage) {
    additionalFields.modelPath = predictor.model?.storage?.path || '';
  }

  if (connectionType === ModelServingCompatibleTypes.OCI) {
    additionalFields.modelUri = predictor.model?.storageUri || '';
  }

  return additionalFields;
};

type KServeModelResource = ModelResourceType & {
  spec: {
    predictor: {
      model?: {
        storageUri?: string;
        storage?: {
          path?: string;
          key?: string;
        };
      };
      imagePullSecrets?: { name: string }[];
    };
  };
  metadata: {
    annotations?: {
      [MetadataAnnotation.ConnectionName]?: string;
    };
  };
};

type KServeDeployment = Deployment<KServeModelResource, ServerResourceType> & {
  connectionType?: ConnectionTypeConfigMapObj;
};

export const extractKServeModelLocationData = async (
  deployment: KServeDeployment,
  connectionTypes: ConnectionTypeConfigMapObj[],
): Promise<ModelLocationData> => {
  // Check for connection annotation first
  const connectionAnnotation = hasConnectionAnnotation(deployment);
  // Handle PVC/URI cases first (no connection needed)
  const uri = getModelLocationUri(deployment);
  if (uri && isPVCUri(uri)) {
    return {
      type: ModelLocationType.PVC,
      fieldValues: { URI: uri },
      additionalFields: {},
    };
  }

  // If we have a connection annotation, use that
  if (connectionAnnotation) {
    const additionalFields = extractAdditionalFields(deployment);
    const secretData = await getSecretData(
      connectionAnnotation,
      deployment.model.metadata.namespace,
    );
    if (secretData?.hasOwnerRef) {
      // Secret has owner ref - show as new connection with prefilled data
      return {
        type: ModelLocationType.NEW,
        fieldValues: secretData.data,
        connectionTypeObject: getConnectionTypeObject(
          secretData.connectionTypeRef,
          connectionTypes,
        ),
        additionalFields,
      };
    }
    // No owner ref - existing connection
    return {
      type: ModelLocationType.EXISTING,
      connection: connectionAnnotation,
      fieldValues: {},
      additionalFields,
    };
  }

  // Check for legacy connection methods in predictor
  const {
    model: {
      spec: { predictor },
    },
  } = deployment;
  const secretName = predictor.model?.storage?.key || predictor.imagePullSecrets?.[0]?.name;

  if (secretName) {
    const additionalFields = extractAdditionalFields(deployment);
    return {
      type: ModelLocationType.EXISTING,
      connection: secretName,
      fieldValues: {},
      additionalFields,
    };
  }

  // No connection - default to URI
  if (uri) {
    return {
      type: ModelLocationType.NEW,
      fieldValues: { URI: uri },
      // Add connection type object for URI to preselect on edit
      connectionTypeObject: getConnectionTypeObject(ConnectionTypeRefs.URI, connectionTypes),
      additionalFields: {},
    };
  }

  // Fallback
  return {
    type: ModelLocationType.NEW,
    fieldValues: { URI: 'https://test' },
    additionalFields: {},
  };
};
