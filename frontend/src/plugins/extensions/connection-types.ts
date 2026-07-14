import type { ConnectionTypeConfigMapObj, Connection } from '@odh-dashboard/k8s-core';
import type {
  ConnectionTypesServiceExtension,
  ConnectionTypeFormFieldsExtension,
  ConnectionDetailsHelperTextExtension,
  DefaultValueTextRendererExtension,
  ConnectionTypeFormExtension,
} from '@odh-dashboard/plugin-core/extension-points';

type ConnectionTypeExtension =
  | ConnectionTypesServiceExtension
  | ConnectionTypeFormFieldsExtension
  | ConnectionDetailsHelperTextExtension
  | DefaultValueTextRendererExtension
  | ConnectionTypeFormExtension;

const resolveFetchConnectionTypes = async (): Promise<
  () => Promise<ConnectionTypeConfigMapObj[]>
> => {
  const { fetchConnectionTypes } = await import('#~/services/connectionTypesService');
  return fetchConnectionTypes;
};

const resolveFetchConnections = async (): Promise<
  (namespace: string, labelSelector?: string) => Promise<Connection[]>
> => {
  const { getSecretsByLabel } = await import('#~/api/k8s/secrets');
  const { isConnection } = await import('#~/concepts/connectionTypes/utils');
  return async (namespace: string, labelSelector?: string) => {
    const secrets = await getSecretsByLabel(labelSelector ?? '', namespace);
    return secrets.filter(isConnection);
  };
};

const resolveDetailsHelperComponent = async (): Promise<{
  default: React.ComponentType;
}> => {
  const { ConnectionDetailsHelperText } = await import(
    '#~/concepts/connectionTypes/ConnectionDetailsHelperText'
  );
  return { default: ConnectionDetailsHelperText };
};

const extensions: ConnectionTypeExtension[] = [
  {
    type: 'app.connection-types/service',
    properties: {
      fetchConnectionTypes: resolveFetchConnectionTypes,
      fetchConnections: resolveFetchConnections,
    },
  },
  {
    type: 'app.connection-types/form-fields',
    properties: {
      component: () => import('#~/concepts/connectionTypes/fields/ConnectionTypeFormFields'),
    },
  },
  {
    type: 'app.connection-types/details-helper',
    properties: {
      component: resolveDetailsHelperComponent,
    },
  },
  {
    type: 'app.connection-types/default-value-renderer',
    properties: {
      component: () => import('#~/concepts/connectionTypes/fields/DefaultValueTextRenderer'),
    },
  },
  {
    type: 'app.connection-types/form',
    properties: {
      component: () => import('#~/concepts/connectionTypes/ConnectionTypeForm'),
    },
  },
];

export default extensions;
