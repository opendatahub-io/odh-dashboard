import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type {
  ConnectionTypeConfigMapObj,
  Connection,
  ConnectionTypeField,
  ConnectionTypeDataField,
  ConnectionTypeValueType,
  FieldMode,
} from '@odh-dashboard/k8s-core';
// eslint-disable-next-line no-restricted-syntax
import { createExtensionGuard } from './utils';
import type { ComponentCodeRef } from '../core/types';

// -- Service extension: data-fetching functions --

export type ConnectionTypesServiceProperties = {
  fetchConnectionTypes: CodeRef<() => Promise<ConnectionTypeConfigMapObj[]>>;
  fetchConnections: CodeRef<(namespace: string, labelSelector?: string) => Promise<Connection[]>>;
};

export type ConnectionTypesServiceExtension = Extension<
  'app.connection-types/service',
  ConnectionTypesServiceProperties
>;

export const isConnectionTypesServiceExtension =
  createExtensionGuard<ConnectionTypesServiceExtension>('app.connection-types/service');

// -- UI component extensions --

export type ConnectionTypeFormFieldsProps = {
  fields?: ConnectionTypeField[];
  isPreview?: boolean;
  isDisabled?: boolean;
  onChange?: (field: ConnectionTypeDataField, value: ConnectionTypeValueType) => void;
  connectionValues?: Record<string, ConnectionTypeValueType>;
  onValidate?: (
    field: ConnectionTypeDataField,
    error: boolean | string,
    value?: ConnectionTypeValueType,
  ) => void;
  connectionErrors?: Record<string, boolean | string>;
};

export type ConnectionTypeFormFieldsExtension = Extension<
  'app.connection-types/form-fields',
  { component: ComponentCodeRef<ConnectionTypeFormFieldsProps> }
>;

export const isConnectionTypeFormFieldsExtension =
  createExtensionGuard<ConnectionTypeFormFieldsExtension>('app.connection-types/form-fields');

export type ConnectionDetailsHelperTextProps = {
  connection?: Connection;
  connectionType?: ConnectionTypeConfigMapObj;
};

export type ConnectionDetailsHelperTextExtension = Extension<
  'app.connection-types/details-helper',
  { component: ComponentCodeRef<ConnectionDetailsHelperTextProps> }
>;

export const isConnectionDetailsHelperTextExtension =
  createExtensionGuard<ConnectionDetailsHelperTextExtension>('app.connection-types/details-helper');

export type DefaultValueTextRendererProps = {
  id: string;
  field: ConnectionTypeDataField;
  mode?: FieldMode;
  children: React.ReactNode;
  component?: 'div' | 'pre';
};

export type DefaultValueTextRendererExtension = Extension<
  'app.connection-types/default-value-renderer',
  { component: ComponentCodeRef<DefaultValueTextRendererProps> }
>;

export const isDefaultValueTextRendererExtension =
  createExtensionGuard<DefaultValueTextRendererExtension>(
    'app.connection-types/default-value-renderer',
  );

export type ConnectionTypeFormExtension = Extension<
  'app.connection-types/form',
  { component: ComponentCodeRef }
>;

export const isConnectionTypeFormExtension = createExtensionGuard<ConnectionTypeFormExtension>(
  'app.connection-types/form',
);
