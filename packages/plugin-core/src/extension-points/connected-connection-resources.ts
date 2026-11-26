import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type { ProjectKind, Connection } from '@odh-dashboard/k8s-core';
// eslint-disable-next-line no-restricted-syntax
import { createExtensionGuard } from './utils';
import type { ConnectedResourceLabel } from './cluster-storage';

export type ConnectionsConnectedResources<TData = unknown> = {
  loaded: boolean;
  data: TData;
};

export type ConnectionsConnectedResourcesProperties<TData = unknown> = {
  useConnectedResources: CodeRef<(project: ProjectKind) => ConnectionsConnectedResources<TData>>;
  getConnectedResources: CodeRef<(resource: Connection, data: TData) => ConnectedResourceLabel[]>;
};

export type ConnectionsConnectedResourcesExtension<TData = unknown> = Extension<
  'app.connections/connected-resources',
  ConnectionsConnectedResourcesProperties<TData>
>;

export const isConnectionsConnectedResourcesExtension =
  createExtensionGuard<ConnectionsConnectedResourcesExtension>(
    'app.connections/connected-resources',
  );
